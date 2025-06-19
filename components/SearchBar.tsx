import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = "Search...",
  onClear
}) => {
  const handleClear = () => {
    onChangeText('');
    if (onClear) {
      onClear();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchInputContainer}>
        <MaterialIcons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <Pressable onPress={handleClear} style={styles.clearButton}>
            <MaterialIcons name="clear" size={18} color="#9ca3af" />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default SearchBar;