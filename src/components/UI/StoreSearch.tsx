import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, ChevronDown, Star, Clock, SlidersHorizontal } from 'lucide-react';
import { stores, searchStores, Store } from '../../data/stores';
import { favoritesService } from '../../services/favoritesService';
import { User } from '../../types';

interface StoreSearchProps {
  value?: string;
  onChange: (storeId: string, storeName: string) => void;
  disabled?: boolean;
  placeholder?: string;
  user?: User | null;
}

interface FilterState {
  province: string;
  city: string;
  quickFilter: 'all' | 'favorites' | 'recent' | 'popular';
  sortBy: 'name' | 'city' | 'recent';
  searchQuery: string;
}

const StoreSearch: React.FC<StoreSearchProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Search Boxer & Pick n Pay stores...",
  user
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStores, setFilteredStores] = useState<Store[]>(stores);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentStores, setRecentStores] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    province: 'all',
    city: 'all',
    quickFilter: 'all',
    sortBy: 'name',
    searchQuery: ''
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load favorites and recent stores
  useEffect(() => {
    const loadFavorites = async () => {
      if (user) {
        try {
          // Load favorites from profile
          const profileFavorites = await favoritesService.getFavorites(user);
          setFavorites(profileFavorites);

          // Migrate localStorage favorites if any exist
          await favoritesService.migrateFavoritesFromLocalStorage(user);
        } catch (error) {
          console.error('Error loading favorites:', error);
          // Fallback to localStorage if profile loading fails
          const savedFavorites = localStorage.getItem('store-favorites');
          if (savedFavorites) {
            setFavorites(JSON.parse(savedFavorites));
          }
        }
      } else {
        // User not authenticated, use localStorage
        const savedFavorites = localStorage.getItem('store-favorites');
        if (savedFavorites) {
          setFavorites(JSON.parse(savedFavorites));
        }
      }
    };

    const loadRecent = () => {
      const savedRecent = localStorage.getItem('store-recent');
      if (savedRecent) {
        setRecentStores(JSON.parse(savedRecent));
      }
    };

    loadFavorites();
    loadRecent();
  }, [user]);

  // Find selected store from value
  useEffect(() => {
    if (value) {
      const store = stores.find(s => s.id === value);
      if (store) {
        setSelectedStore(store);
        setSearchQuery(store.name);
      } else {
        setSelectedStore(null);
        setSearchQuery('');
      }
    } else {
      setSelectedStore(null);
      setSearchQuery('');
    }
  }, [value]);

  // Apply filters and search
  useEffect(() => {
    let filtered = searchStores(searchQuery);

    // Apply province filter
    if (filters.province !== 'all') {
      filtered = filtered.filter(store => store.province === filters.province);
    }

    // Apply city filter
    if (filters.city !== 'all') {
      filtered = filtered.filter(store => store.city === filters.city);
    }

    // Apply quick filters
    if (filters.quickFilter === 'favorites') {
      filtered = filtered.filter(store => favorites.includes(store.id));
    } else if (filters.quickFilter === 'recent') {
      filtered = filtered.filter(store => recentStores.includes(store.id));
    } else if (filters.quickFilter === 'popular') {
      // Popular stores are those in major cities
      const popularCities = ['Cape Town', 'Johannesburg', 'Pretoria', 'Durban'];
      filtered = filtered.filter(store => popularCities.includes(store.city));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'city':
          return a.city.localeCompare(b.city) || a.name.localeCompare(b.name);
        case 'recent': {
          const aIndex = recentStores.indexOf(a.id);
          const bIndex = recentStores.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        }
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredStores(filtered);
  }, [searchQuery, filters, favorites, recentStores]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowFilters(false);
        // Reset search query to selected store name if exists
        if (selectedStore) {
          setSearchQuery(selectedStore.name);
        } else {
          setSearchQuery('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedStore]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setFilters(prev => ({ ...prev, searchQuery: query }));
    setIsOpen(true);
  };

  const handleStoreSelect = (store: Store) => {
    setSelectedStore(store);
    setSearchQuery(store.name);
    setIsOpen(false);
    setShowFilters(false);
    onChange(store.id, store.name);

    // Add to recent stores
    const updatedRecent = [store.id, ...recentStores.filter(id => id !== store.id)].slice(0, 10);
    setRecentStores(updatedRecent);
    localStorage.setItem('store-recent', JSON.stringify(updatedRecent));
  };

  const toggleFavorite = async (storeId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (user) {
      try {
        // Use FavoritesService for authenticated users
        const result = await favoritesService.toggleFavorite(user, storeId);
        if (result.success) {
          // Update local state based on the result
          const updatedFavorites = result.isFavorite
            ? [...favorites, storeId]
            : favorites.filter(id => id !== storeId);
          setFavorites(updatedFavorites);
        } else {
          console.error('Failed to toggle favorite');
        }
      } catch (error) {
        console.error('Error toggling favorite:', error);
        // Fallback to localStorage on error
        const updatedFavorites = favorites.includes(storeId)
          ? favorites.filter(id => id !== storeId)
          : [...favorites, storeId];
        setFavorites(updatedFavorites);
        localStorage.setItem('store-favorites', JSON.stringify(updatedFavorites));
      }
    } else {
      // Use localStorage for unauthenticated users
      const updatedFavorites = favorites.includes(storeId)
        ? favorites.filter(id => id !== storeId)
        : [...favorites, storeId];

      setFavorites(updatedFavorites);
      localStorage.setItem('store-favorites', JSON.stringify(updatedFavorites));
    }
  };

  const handleClearSelection = () => {
    setSelectedStore(null);
    setSearchQuery('');
    setFilters(prev => ({ ...prev, searchQuery: '' }));
    onChange('', '');
    inputRef.current?.focus();
  };

  const clearAllFilters = () => {
    setFilters({
      province: 'all',
      city: 'all',
      quickFilter: 'all',
      sortBy: 'name',
      searchQuery: searchQuery
    });
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setShowFilters(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredStores.length > 0) {
        handleStoreSelect(filteredStores[0]);
      }
    }
  };

  // Get unique provinces and cities for filter options
  const uniqueProvinces = [...new Set(stores.map(store => store.province))].sort();
  const uniqueCities = [...new Set(stores.map(store => store.city))].sort();

  const groupedStores = filteredStores.reduce((acc, store) => {
    if (!acc[store.province]) {
      acc[store.province] = [];
    }
    acc[store.province].push(store);
    return acc;
  }, {} as Record<string, Store[]>);

  const hasActiveFilters = filters.province !== 'all' || filters.city !== 'all' || filters.quickFilter !== 'all' || filters.sortBy !== 'name';

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <Search size={16} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="input-field pl-10 pr-20 w-full"
          autoComplete="off"
        />

        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1 rounded transition-colors ${
              hasActiveFilters
                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            disabled={disabled}
            title="Filter options"
          >
            <SlidersHorizontal size={16} />
          </button>

          {selectedStore && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={disabled}
              title="Clear selection"
            >
              <X size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={disabled}
          >
            <ChevronDown size={16} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Filter Options</h3>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">Quick Filters</label>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              {[
                { key: 'all', label: 'All Stores', icon: null },
                { key: 'favorites', label: 'Favorites', icon: Star },
                { key: 'recent', label: 'Recent', icon: Clock },
                { key: 'popular', label: 'Popular', icon: MapPin }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, quickFilter: key as 'all' | 'favorites' | 'recent' | 'popular' }))}
                  className={`flex items-center justify-center gap-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                    filters.quickFilter === key
                      ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {Icon && <Icon size={12} />}
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {filters.province !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {filters.province}
                    <button
                      type="button"
                      onClick={() => setFilters(prev => ({ ...prev, province: 'all' }))}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}
                {filters.city !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    {filters.city}
                    <button
                      type="button"
                      onClick={() => setFilters(prev => ({ ...prev, city: 'all' }))}
                      className="hover:bg-green-200 rounded-full p-0.5"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4">
            {/* Province Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Province</label>
              <select
                value={filters.province}
                onChange={(e) => setFilters(prev => ({ ...prev, province: e.target.value, city: 'all' }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Provinces</option>
                {uniqueProvinces.map(province => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">City</label>
              <select
                value={filters.city}
                onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                disabled={filters.province === 'all'}
              >
                <option value="all">{filters.province === 'all' ? 'Select province first' : 'All Cities'}</option>
                {uniqueCities
                  .filter(city => filters.province === 'all' ||
                    stores.some(store => store.city === city && store.province === filters.province)
                  )
                  .map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))
                }
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Sort by</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as 'name' | 'city' | 'recent' }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="name">Name</option>
                <option value="city">City</option>
                <option value="recent">Recent</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Store Dropdown */}
      {isOpen && !showFilters && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {filteredStores.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <div className="flex flex-col items-center gap-2">
                <MapPin size={24} className="text-gray-300" />
                <p>No stores found</p>
                <p className="text-sm">
                  {filters.quickFilter === 'favorites' && favorites.length === 0
                    ? 'You haven\'t added any favorites yet'
                    : filters.quickFilter === 'recent' && recentStores.length === 0
                    ? 'No recent stores to show'
                    : 'Try adjusting your search or filters'
                  }
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2">
              {/* Quick Actions */}
              {(favorites.length > 0 || recentStores.length > 0) && filters.quickFilter === 'all' && (
                <div className="mb-3 pb-3 border-b border-gray-100">
                  {favorites.length > 0 && (
                    <div className="mb-2">
                      <div className="px-2 py-1 text-xs font-semibold text-yellow-600 uppercase tracking-wide flex items-center gap-1">
                        <Star size={12} className="fill-current" />
                        Favorites
                      </div>
                      {stores
                        .filter(store => favorites.includes(store.id))
                        .slice(0, 10)
                        .map(store => (
                          <StoreItem
                            key={store.id}
                            store={store}
                            onSelect={handleStoreSelect}
                            onToggleFavorite={toggleFavorite}
                            isFavorite={favorites.includes(store.id)}
                            isRecent={recentStores.includes(store.id)}
                          />
                        ))
                      }
                    </div>
                  )}

                  {recentStores.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-xs font-semibold text-blue-600 uppercase tracking-wide flex items-center gap-1">
                        <Clock size={12} />
                        Recent
                      </div>
                      {stores
                        .filter(store => recentStores.includes(store.id))
                        .slice(0, 10)
                        .map(store => (
                          <StoreItem
                            key={store.id}
                            store={store}
                            onSelect={handleStoreSelect}
                            onToggleFavorite={toggleFavorite}
                            isFavorite={favorites.includes(store.id)}
                            isRecent={recentStores.includes(store.id)}
                          />
                        ))
                      }
                    </div>
                  )}
                </div>
              )}

              {/* Grouped Stores */}
              {Object.entries(groupedStores)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([province, stores]) => (
                  <div key={province} className="mb-3 last:mb-0">
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      {province} ({stores.length})
                    </div>
                    <div className="mt-1">
                      {stores.map((store) => (
                        <StoreItem
                          key={store.id}
                          store={store}
                          onSelect={handleStoreSelect}
                          onToggleFavorite={toggleFavorite}
                          isFavorite={favorites.includes(store.id)}
                          isRecent={recentStores.includes(store.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* Store count indicator */}
      {isOpen && !showFilters && (
        <div className="absolute z-40 -bottom-6 left-0 text-xs text-gray-500">
          {filteredStores.length} store{filteredStores.length !== 1 ? 's' : ''} found
          {hasActiveFilters && ' (filtered)'}
        </div>
      )}
    </div>
  );
};

// Store Item Component
interface StoreItemProps {
  store: Store;
  onSelect: (store: Store) => void;
  onToggleFavorite: (storeId: string, e: React.MouseEvent) => void;
  isFavorite: boolean;
  isRecent: boolean;
}

const StoreItem: React.FC<StoreItemProps> = ({ store, onSelect, onToggleFavorite, isFavorite, isRecent }) => {
  const handleStoreClick = () => {
    onSelect(store);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(store.id, e);
  };

  return (
    <div
      onClick={handleStoreClick}
      className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors rounded-md focus:outline-none focus:bg-gray-50 group cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <MapPin size={14} className="text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate flex items-center gap-2">
            {store.name}
            {isRecent && <Clock size={12} className="text-blue-500" />}
          </div>
          <div className="text-sm text-gray-500 truncate">
            {store.suburb}, {store.city}
          </div>
        </div>
        <button
          onClick={handleFavoriteClick}
          className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
            isFavorite
              ? 'text-yellow-500 hover:text-yellow-600 opacity-100'
              : 'text-gray-400 hover:text-yellow-500'
          }`}
        >
          <Star size={14} className={isFavorite ? 'fill-current' : ''} />
        </button>
      </div>
    </div>
  );
};

export default StoreSearch;
