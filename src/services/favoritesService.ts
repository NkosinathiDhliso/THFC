import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface UserFavorite {
  id: string;
  user_id: string;
  store_id: string;
  created_at: string;
  updated_at: string;
}

export class FavoritesService {
  private static instance: FavoritesService;
  private cache: Map<string, string[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): FavoritesService {
    if (!FavoritesService.instance) {
      FavoritesService.instance = new FavoritesService();
    }
    return FavoritesService.instance;
  }

  /**
   * Get user's favorite store IDs
   */
  async getFavorites(user: User): Promise<string[]> {
    try {
      // Check cache first
      const cached = this.getCachedFavorites(user.id);
      if (cached !== null) {
        return cached;
      }

      // Quick fetch with very short timeout - fail fast for better UX
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Get favorites timeout')), 3000); // 3 second timeout
      });

      const fetchPromise = supabase
        .from('user_favorites')
        .select('store_id')
        .eq('user_id', user.id)
        .limit(20); // Small limit for speed

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as { data: any; error: any };

      if (error) {
        console.warn('Database error fetching favorites, caching empty list for performance:', error);
        // Cache empty result to prevent repeated failed attempts
        this.setCachedFavorites(user.id, []);
        return [];
      }

      const favorites = data?.map(item => item.store_id) || [];
      this.setCachedFavorites(user.id, favorites);
      return favorites;
    } catch (error) {
      console.warn('Favorites service timeout - caching empty list to prevent repeated attempts:', error);
      // Cache empty result to prevent repeated timeouts
      this.setCachedFavorites(user.id, []);
      return [];
    }
  }

  /**
   * Add a store to user's favorites
   */
  async addFavorite(user: User, storeId: string): Promise<boolean> {
    try {
      // Quick add with shorter timeout for better UX
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Add favorite timeout')), 5000); // 5 second timeout
      });

      const addPromise = supabase
        .from('user_favorites')
        .insert({
          user_id: user.id,
          store_id: storeId
        });

      const { error } = await Promise.race([addPromise, timeoutPromise]) as { error: any };

      if (error) {
        console.error('Error adding favorite:', error);
        
        // If it's a duplicate key error, treat as success (already favorited)
        if (error.code === '23505') {
          console.log('Store already favorited by user');
          // Update cache anyway
          this.invalidateCache(user.id);
          return true;
        }
        
        return false;
      }

      // Update cache
      this.invalidateCache(user.id);
      return true;
    } catch (error) {
      console.error('Error in addFavorite:', error);
      return false;
    }
  }

  /**
   * Remove a store from user's favorites
   */
  async removeFavorite(user: User, storeId: string): Promise<boolean> {
    try {
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Remove favorite timeout')), 10000);
      });

      const removePromise = supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('store_id', storeId);

      const { error } = await Promise.race([removePromise, timeoutPromise]) as { error: any };

      if (error) {
        console.error('Error removing favorite:', error);
        return false;
      }

      // Update cache
      this.invalidateCache(user.id);
      return true;
    } catch (error) {
      console.error('Error in removeFavorite:', error);
      return false;
    }
  }

  /**
   * Toggle favorite status for a store
   */
  async toggleFavorite(user: User, storeId: string): Promise<{ success: boolean; isFavorite: boolean }> {
    try {
      const favorites = await this.getFavorites(user);
      const isFavorite = favorites.includes(storeId);

      let success: boolean;
      if (isFavorite) {
        success = await this.removeFavorite(user, storeId);
      } else {
        success = await this.addFavorite(user, storeId);
      }

      return {
        success,
        isFavorite: success ? !isFavorite : isFavorite
      };
    } catch (error) {
      console.error('Error in toggleFavorite:', error);
      return { success: false, isFavorite: false };
    }
  }

  /**
   * Migrate favorites from localStorage to user profile
   */
  async migrateFavoritesFromLocalStorage(user: User): Promise<boolean> {
    try {
      const localFavorites = this.getLocalStorageFavorites();
      if (localFavorites.length === 0) {
        return true; // Nothing to migrate
      }

      // Get current profile favorites to avoid duplicates
      const profileFavorites = await this.getFavorites(user);
      const newFavorites = localFavorites.filter(storeId => !profileFavorites.includes(storeId));

      if (newFavorites.length === 0) {
        // Clear localStorage since everything is already in profile
        this.clearLocalStorageFavorites();
        return true;
      }

      // Batch insert new favorites with timeout protection
      const favoritesToInsert = newFavorites.map(storeId => ({
        user_id: user.id,
        store_id: storeId
      }));

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Migration timeout')), 15000);
      });

      const insertPromise = supabase
        .from('user_favorites')
        .insert(favoritesToInsert);

      const { error } = await Promise.race([insertPromise, timeoutPromise]) as { error: any };

      if (error) {
        console.error('Error migrating favorites:', error);
        return false;
      }

      // Clear localStorage after successful migration
      this.clearLocalStorageFavorites();
      this.invalidateCache(user.id);
      
      console.log(`Successfully migrated ${newFavorites.length} favorites to profile`);
      return true;
    } catch (error) {
      console.error('Error in migrateFavoritesFromLocalStorage:', error);
      return false;
    }
  }

  /**
   * Get favorites from localStorage (fallback)
   */
  private getLocalStorageFavorites(): string[] {
    try {
      const saved = localStorage.getItem('store-favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error reading localStorage favorites:', error);
      return [];
    }
  }

  /**
   * Clear favorites from localStorage
   */
  private clearLocalStorageFavorites(): void {
    try {
      localStorage.removeItem('store-favorites');
    } catch (error) {
      console.error('Error clearing localStorage favorites:', error);
    }
  }

  /**
   * Get fallback favorites (from localStorage if available)
   */
  private getFallbackFavorites(): string[] {
    return this.getLocalStorageFavorites();
  }

  /**
   * Get cached favorites if still valid
   */
  private getCachedFavorites(userId: string): string[] | null {
    const cached = this.cache.get(userId);
    const expiry = this.cacheExpiry.get(userId);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }
    
    return null;
  }

  /**
   * Set cached favorites with expiry
   */
  private setCachedFavorites(userId: string, favorites: string[]): void {
    this.cache.set(userId, favorites);
    this.cacheExpiry.set(userId, Date.now() + this.CACHE_DURATION);
  }

  /**
   * Invalidate cache for user
   */
  private invalidateCache(userId: string): void {
    this.cache.delete(userId);
    this.cacheExpiry.delete(userId);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

// Export singleton instance
export const favoritesService = FavoritesService.getInstance();