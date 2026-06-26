package com.anonymous.native_reader.markdownselection

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class SelectableMarkdownViewManager : SimpleViewManager<SelectableMarkdownView>() {
  override fun getName(): String = "SelectableMarkdownView"

  override fun createViewInstance(reactContext: ThemedReactContext): SelectableMarkdownView {
    return SelectableMarkdownView(reactContext)
  }

  @ReactProp(name = "markdown")
  fun setMarkdown(view: SelectableMarkdownView, markdown: String?) {
    view.setMarkdown(markdown)
  }

  @ReactProp(name = "textColor")
  fun setTextColor(view: SelectableMarkdownView, color: String?) {
    view.setMarkdownTextColor(color)
  }

  @ReactProp(name = "readerBackgroundColor")
  fun setReaderBackgroundColor(view: SelectableMarkdownView, color: String?) {
    view.setMarkdownBackgroundColor(color)
  }

  @ReactProp(name = "highlights")
  fun setHighlights(view: SelectableMarkdownView, highlights: ReadableArray?) {
    view.setHighlights(highlights)
  }

  @ReactProp(name = "annotations")
  fun setAnnotations(view: SelectableMarkdownView, annotations: ReadableArray?) {
    view.setAnnotations(annotations)
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    return MapBuilder.of(
      "topSelection",
      MapBuilder.of("registrationName", "onSelection"),
      "topVocabularyTap",
      MapBuilder.of("registrationName", "onVocabularyTap"),
      "topAnnotationTap",
      MapBuilder.of("registrationName", "onAnnotationTap")
    )
  }
}
