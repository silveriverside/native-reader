import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { BookCardList, BookCardTag } from './BookCardPills';

interface BookshelfFiltersProps {
  tags: BookCardTag[];
  selectedTagId: string | null;
  onSelectTag: (tagId: string | null) => void;
  lists: BookCardList[];
  selectedListId: string | null;
  onSelectList: (listId: string | null) => void;
}

export default function BookshelfFilters({
  tags,
  selectedTagId,
  onSelectTag,
  lists,
  selectedListId,
  onSelectList,
}: BookshelfFiltersProps) {
  return (
    <>
      {tags.length > 0 ? (
        <View style={styles.wrap}>
          <TouchableOpacity
            style={[styles.tagPill, selectedTagId == null ? styles.tagPillActive : null]}
            activeOpacity={0.85}
            onPress={() => onSelectTag(null)}
          >
            <Text style={[styles.tagText, selectedTagId == null ? styles.tagTextActive : null]}>
              全部标签
            </Text>
          </TouchableOpacity>
          {tags.map((tag) => {
            const active = selectedTagId === tag.id;
            return (
              <TouchableOpacity
                key={tag.id}
                style={[styles.tagPill, active ? styles.tagPillActive : null]}
                activeOpacity={0.85}
                onPress={() => onSelectTag(active ? null : tag.id)}
              >
                <View style={[styles.tagDot, { backgroundColor: tag.color ?? '#007AFF' }]} />
                <Text style={[styles.tagText, active ? styles.tagTextActive : null]}>{tag.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
      {lists.length > 0 ? (
        <View style={styles.wrap}>
          <TouchableOpacity
            style={[styles.listPill, selectedListId == null ? styles.listPillActive : null]}
            activeOpacity={0.85}
            onPress={() => onSelectList(null)}
          >
            <Text style={[styles.listText, selectedListId == null ? styles.listTextActive : null]}>
              全部书单
            </Text>
          </TouchableOpacity>
          {lists.map((list) => {
            const active = selectedListId === list.id;
            return (
              <TouchableOpacity
                key={list.id}
                style={[styles.listPill, active ? styles.listPillActive : null]}
                activeOpacity={0.85}
                onPress={() => onSelectList(active ? null : list.id)}
              >
                <Text style={[styles.listText, active ? styles.listTextActive : null]}>{list.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
  },
  tagPillActive: {
    backgroundColor: '#EAF3FF',
  },
  tagDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5A6068',
  },
  tagTextActive: {
    color: '#0066CC',
  },
  listPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
  },
  listPillActive: {
    backgroundColor: '#F7F1E8',
  },
  listText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5A6068',
  },
  listTextActive: {
    color: '#7A4A12',
  },
});
