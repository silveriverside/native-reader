import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface BookCardTag {
  id: string;
  name: string;
  color: string | null;
}

export interface BookCardList {
  id: string;
  title: string;
}

interface BookCardPillsProps {
  tags: BookCardTag[];
  lists: BookCardList[];
}

export default function BookCardPills({ tags, lists }: BookCardPillsProps) {
  const visibleTags = tags.slice(0, 3);
  const hiddenTagCount = Math.max(tags.length - visibleTags.length, 0);
  const visibleLists = lists.slice(0, 2);
  const hiddenListCount = Math.max(lists.length - visibleLists.length, 0);

  return (
    <>
      {tags.length > 0 ? (
        <View style={styles.tagRow}>
          {visibleTags.map((tag) => (
            <View key={tag.id} style={styles.tagPill}>
              <View style={[styles.tagDot, { backgroundColor: tag.color ?? '#007AFF' }]} />
              <Text style={styles.tagText} numberOfLines={1}>
                {tag.name}
              </Text>
            </View>
          ))}
          {hiddenTagCount > 0 ? <Text style={styles.moreText}>+{hiddenTagCount}</Text> : null}
        </View>
      ) : null}
      {lists.length > 0 ? (
        <View style={styles.listRow}>
          {visibleLists.map((list) => (
            <View key={list.id} style={styles.listPill}>
              <Text style={styles.listText} numberOfLines={1}>
                {list.title}
              </Text>
            </View>
          ))}
          {hiddenListCount > 0 ? <Text style={styles.moreText}>+{hiddenListCount}</Text> : null}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 96,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F1F4F8',
    marginRight: 6,
    marginBottom: 4,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5A6068',
  },
  listRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  listPill: {
    maxWidth: 112,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F7F1E8',
    marginRight: 6,
    marginBottom: 4,
  },
  listText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7A4A12',
  },
  moreText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A8F99',
    paddingVertical: 4,
  },
});
