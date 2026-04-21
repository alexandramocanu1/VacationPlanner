import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing, Radius } from '../theme';
import { GOOGLE_MAPS_API_KEY } from '../theme';

interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlaceDetails {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
  photos: string[];
}

interface Props {
  onPlaceSelected: (place: PlaceDetails) => void;
  accentColor?: string;
}

export default function PlacesSearchInput({ onPlaceSelected, accentColor = Colors.accent }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
  setLoading(true);

  try {
    const res = await fetch(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask':
            'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
        },
        body: JSON.stringify({
          input: text,
          languageCode: 'ro',
        }),
      }
    );

    const data = await res.json();

    console.log('Places response:', data);

    setSuggestions(
      (data.suggestions ?? []).map((s: any) => ({
        place_id: s.placePrediction.placeId,
        description: s.placePrediction.text.text,
        structured_formatting: {
          main_text: s.placePrediction.text.text,
          secondary_text: '',
        },
      }))
    );

  } catch (e) {
    console.log('Places error:', e);
    setSuggestions([]);
  }

  setLoading(false);
}, 350);
  };

const selectPlace = async (suggestion: any) => {
  setSuggestions([]);
  setQuery(suggestion.description);
  setFetchingDetails(true);

  try {
    const placeId = suggestion.place_id;

    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask':
            'displayName,formattedAddress,location,photos',
        },
      }
    );

    const data = await res.json();

    console.log('Place details:', data);

    if (!data) return;

    onPlaceSelected({
      name:
        data.displayName?.text ??
        suggestion.placePrediction.text.text,

      address: data.formattedAddress ?? '',

      lat: data.location?.latitude ?? 0,

      lng: data.location?.longitude ?? 0,

      placeId: placeId,

      photos: [],
    });

    setQuery('');
  } catch (e) {
    console.log('Place details error:', e);
  }

  setFetchingDetails(false);
};


  return (
    <View style={styles.wrapper}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Caută locație... (ex: Colosseum Roma)"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={fetchSuggestions}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {(loading || fetchingDetails) && (
          <ActivityIndicator color={accentColor} size="small" style={styles.spinner} />
        )}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={item => item.place_id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestion}
                onPress={() => selectPlace(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionMain} numberOfLines={1}>
                  {item.structured_formatting?.main_text ?? item.description}
                </Text>
                {item.structured_formatting?.secondary_text ? (
                  <Text style={styles.suggestionSub} numberOfLines={1}>
                    {item.structured_formatting.secondary_text}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 100 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  input: {
    flex: 1,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 15,
  },
  spinner: { paddingRight: Spacing.sm },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginTop: 4,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  suggestion: {
    padding: Spacing.md,
  },
  suggestionMain: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionSub: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.cardBorder,
  },
});