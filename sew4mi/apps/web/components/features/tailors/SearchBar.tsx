'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, MapPin, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { cn } from '@/lib/utils';
import { AutocompleteSuggestion, SEARCH_CONFIG } from '@sew4mi/shared';

interface SearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  showRecentSearches?: boolean;
}

const RECENT_SEARCHES_KEY = 'sew4mi_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export function SearchBar({
  initialQuery = '',
  onSearch,
  placeholder = 'Search tailors, specializations, or locations...',
  className,
  showRecentSearches = true,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Debounce query for autocomplete
  const debouncedQuery = useDebounce(query, SEARCH_CONFIG.AUTOCOMPLETE_DEBOUNCE_MS);
  
  // Autocomplete hook
  const { suggestions, isLoading: isAutocompleteLoading } = useAutocomplete(
    debouncedQuery.length >= SEARCH_CONFIG.MIN_QUERY_LENGTH ? debouncedQuery : ''
  );

  // Load recent searches from localStorage
  useEffect(() => {
    if (showRecentSearches && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (saved) {
          setRecentSearches(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    }
  }, [showRecentSearches]);

  // Save to recent searches
  const saveToRecentSearches = useCallback((searchQuery: string) => {
    if (!showRecentSearches || !searchQuery.trim()) return;

    try {
      const updated = [
        searchQuery,
        ...recentSearches.filter(s => s !== searchQuery),
      ].slice(0, MAX_RECENT_SEARCHES);
      
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  }, [recentSearches, showRecentSearches]);

  // Handle search submission
  const handleSearch = useCallback((searchQuery?: string) => {
    const finalQuery = (searchQuery || query).trim();
    
    if (finalQuery) {
      onSearch(finalQuery);
      saveToRecentSearches(finalQuery);
    } else {
      onSearch('');
    }
    
    setShowDropdown(false);
    inputRef.current?.blur();
  }, [query, onSearch, saveToRecentSearches]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: AutocompleteSuggestion) => {
    setQuery(suggestion.text);
    handleSearch(suggestion.text);
  }, [handleSearch]);

  // Handle recent search selection
  const handleRecentSearchSelect = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    handleSearch(searchQuery);
  }, [handleSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    const totalItems = suggestions.suggestions.length + (showRecentSearches ? recentSearches.length : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalItems);
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? totalItems - 1 : prev - 1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (selectedIndex < suggestions.suggestions.length) {
            handleSuggestionSelect(suggestions.suggestions[selectedIndex]);
          } else {
            const recentIndex = selectedIndex - suggestions.suggestions.length;
            handleRecentSearchSelect(recentSearches[recentIndex]);
          }
        } else {
          handleSearch();
        }
        break;
      
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [showDropdown, suggestions.suggestions, recentSearches, selectedIndex, handleSuggestionSelect, handleRecentSearchSelect, handleSearch, showRecentSearches]);

  // Handle input focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowDropdown(true);
  }, []);

  // Handle input blur
  const handleBlur = useCallback(() => {
    // Delay to allow click events on dropdown items
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      setSelectedIndex(-1);
    }, 150);
  }, []);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    
    if (value.length >= SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      setShowDropdown(true);
    }
  }, []);

  // Clear search
  const handleClear = useCallback(() => {
    setQuery('');
    setShowDropdown(false);
    onSearch('');
    inputRef.current?.focus();
  }, [onSearch]);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showSuggestions = showDropdown && (suggestions.suggestions.length > 0 || recentSearches.length > 0);

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'tailor': return <User className="h-4 w-4 text-blue-500" />;
      case 'location': return <MapPin className="h-4 w-4 text-green-500" />;
      default: return <Search className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={cn('relative w-full max-w-2xl', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            'pl-10 pr-20 py-3 text-base',
            'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            isFocused && 'ring-2 ring-blue-500 border-blue-500'
          )}
          maxLength={SEARCH_CONFIG.MAX_QUERY_LENGTH}
        />

        {/* Clear Button */}
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-12 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Search Button */}
        <Button
          type="button"
          onClick={() => handleSearch()}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 px-3"
        >
          {isAutocompleteLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Dropdown */}
      {showSuggestions && (
        <Card 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto shadow-lg"
        >
          <div className="p-2">
            {/* Suggestions */}
            {suggestions.suggestions.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Suggestions
                </div>
                {suggestions.suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded-md transition-colors',
                      'hover:bg-gray-100',
                      selectedIndex === index && 'bg-blue-50 text-blue-900'
                    )}
                  >
                    {getSuggestionIcon(suggestion.type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{suggestion.text}</div>
                      {suggestion.meta && (
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          {suggestion.meta.city && (
                            <span>{suggestion.meta.city}</span>
                          )}
                          {suggestion.meta.rating && (
                            <Badge variant="secondary" className="text-xs">
                              ★ {suggestion.meta.rating}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {suggestion.type}
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {showRecentSearches && recentSearches.length > 0 && (
              <div className={cn('space-y-1', suggestions.suggestions.length > 0 && 'mt-4')}>
                <div className="flex items-center justify-between px-2 py-1">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Recent Searches
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentSearches}
                    className="h-auto p-0 text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </Button>
                </div>
                {recentSearches.map((search, index) => {
                  const adjustedIndex = suggestions.suggestions.length + index;
                  return (
                    <button
                      key={search}
                      onClick={() => handleRecentSearchSelect(search)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded-md transition-colors',
                        'hover:bg-gray-100',
                        selectedIndex === adjustedIndex && 'bg-blue-50 text-blue-900'
                      )}
                    >
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="flex-1 truncate">{search}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* No Results */}
            {suggestions.suggestions.length === 0 && recentSearches.length === 0 && debouncedQuery && (
              <div className="px-3 py-6 text-center text-sm text-gray-500">
                No suggestions found for "{debouncedQuery}"
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}