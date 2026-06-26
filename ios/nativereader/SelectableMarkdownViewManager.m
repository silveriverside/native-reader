#import <React/RCTViewManager.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SelectableMarkdownViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(markdown, NSString)
RCT_REMAP_VIEW_PROPERTY(textColor, markdownTextColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(readerBackgroundColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(highlights, NSArray)
RCT_EXPORT_VIEW_PROPERTY(annotations, NSArray)
RCT_EXPORT_VIEW_PROPERTY(onSelection, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onVocabularyTap, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onAnnotationTap, RCTDirectEventBlock)

@end
