import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BookshelfEntryCardProps {
  icon: string;
  iconBackgroundColor: string;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
}

export default function BookshelfEntryCard({
  icon,
  iconBackgroundColor,
  iconColor,
  title,
  description,
  onPress,
}: BookshelfEntryCardProps) {
  return (
    <TouchableOpacity style={styles.entry} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.icon, { backgroundColor: iconBackgroundColor }]}>
        <Text style={[styles.iconText, { color: iconColor }]}>{icon}</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
    fontWeight: '700',
  },
  textWrap: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  description: {
    fontSize: 13,
    color: '#8A8F99',
  },
  chevron: {
    fontSize: 24,
    color: '#C4C9D1',
    fontWeight: '300',
  },
});
