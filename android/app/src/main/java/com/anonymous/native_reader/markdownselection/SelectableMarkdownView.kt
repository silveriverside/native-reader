package com.anonymous.native_reader.markdownselection

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.text.Selection
import android.text.SpannableString
import android.text.Spanned
import android.text.method.LinkMovementMethod
import android.text.style.ClickableSpan
import android.text.style.UpdateAppearance
import android.view.ActionMode
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.TextView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter

private const val MENU_TRANSLATE = 1
private const val MENU_ADD_TO_VOCABULARY = 2
private const val DEFAULT_HIGHLIGHT_COLOR = "#FFEB3B"

class SelectableMarkdownView(context: Context) : TextView(context) {
  private val reactContext = context as ThemedReactContext
  private var highlightTexts: List<String> = emptyList()
  private var currentMarkdown: String = ""

  // 架构核心：渲染后纯文本的第 i 个字符，对应「传入本视图的 markdown 字符串」里的原文下标。
  // 选词回调据此把渲染区间反查成原文区间；annotation 据此把原文区间正查成渲染区间。
  private var renderToSource: IntArray = IntArray(0)
  private var annotations: List<AnnotationRange> = emptyList()

  private val dashPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeWidth = 3f
    pathEffect = DashPathEffect(floatArrayOf(8f, 6f), 0f)
  }
  private val highlightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.FILL
  }
  private val underlinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeWidth = 4f
  }

  init {
    textSize = 16f
    setLineSpacing(6f, 1.0f)
    setTextColor(Color.parseColor("#1A1A1A"))
    setTextIsSelectable(true)
    customSelectionActionModeCallback = object : ActionMode.Callback {
      override fun onCreateActionMode(mode: ActionMode, menu: Menu): Boolean {
        menu.add(0, MENU_TRANSLATE, 0, "翻译").setShowAsAction(MenuItem.SHOW_AS_ACTION_ALWAYS)
        menu.add(0, MENU_ADD_TO_VOCABULARY, 1, "加入未掌握")
          .setShowAsAction(MenuItem.SHOW_AS_ACTION_ALWAYS)
        emitSelection("selectionChanged")
        return true
      }

      override fun onPrepareActionMode(mode: ActionMode, menu: Menu): Boolean {
        emitSelection("selectionChanged")
        return false
      }

      override fun onActionItemClicked(mode: ActionMode, item: MenuItem): Boolean {
        when (item.itemId) {
          MENU_TRANSLATE -> emitSelection("translate")
          MENU_ADD_TO_VOCABULARY -> emitSelection("addToVocabulary")
          else -> return false
        }
        mode.finish()
        return true
      }

      override fun onDestroyActionMode(mode: ActionMode) = Unit
    }
  }

  override fun onDraw(canvas: Canvas) {
    drawAnnotationBackgrounds(canvas) // 高亮背景在文字下方
    super.onDraw(canvas)
    drawVocabularyDashes(canvas) // 词条虚线在文字上方
    drawAnnotationUnderlines(canvas) // 划线在文字上方
  }

  fun setMarkdown(markdown: String?) {
    currentMarkdown = markdown.orEmpty()
    text = applyHighlights(renderMarkdown(currentMarkdown))
  }

  fun setHighlights(highlights: ReadableArray?) {
    val list = mutableListOf<String>()
    if (highlights != null) {
      for (index in 0 until highlights.size()) {
        val map = highlights.getMap(index) ?: continue
        val word = if (map.hasKey("text")) map.getString("text") else null
        if (!word.isNullOrEmpty()) list.add(word)
      }
    }
    highlightTexts = list
    text = applyHighlights(renderMarkdown(currentMarkdown))
  }

  // 接收以「原文偏移」为锚点的批注区间，按原文偏移正查渲染区间后绘制
  fun setAnnotations(arr: ReadableArray?) {
    val list = mutableListOf<AnnotationRange>()
    if (arr != null) {
      for (i in 0 until arr.size()) {
        val m = arr.getMap(i) ?: continue
        if (!m.hasKey("startOffset") || !m.hasKey("endOffset")) continue
        val start = m.getInt("startOffset")
        val end = m.getInt("endOffset")
        if (end <= start) continue
        val type = if (m.hasKey("type")) m.getString("type") ?: "highlight" else "highlight"
        val colorStr = if (m.hasKey("color")) m.getString("color") else null
        val color = runCatching { Color.parseColor(colorStr) }
          .getOrDefault(Color.parseColor(DEFAULT_HIGHLIGHT_COLOR))
        val annId = if (m.hasKey("id")) m.getString("id") else null
        list.add(AnnotationRange(start, end, type, color, annId))
      }
    }
    annotations = list
    invalidate()
  }

  fun setMarkdownTextColor(colorString: String?) {
    if (colorString.isNullOrBlank()) return
    runCatching { setTextColor(Color.parseColor(colorString)) }
  }

  fun setMarkdownBackgroundColor(colorString: String?) {
    if (colorString.isNullOrBlank()) return
    runCatching { setBackgroundColor(Color.parseColor(colorString)) }
  }

  // 在渲染后的纯文本里查找所有词条命中处，加虚线下划线 + 单击回调
  private fun applyHighlights(spannable: SpannableString): SpannableString {
    if (highlightTexts.isEmpty()) return spannable
    val content = spannable.toString()
    var hasClickable = false
    highlightTexts.forEach { word ->
      if (word.isEmpty()) return@forEach
      var fromIndex = 0
      while (true) {
        val start = content.indexOf(word, fromIndex)
        if (start < 0) break
        val end = start + word.length
        spannable.setSpan(DashedUnderlineSpan(), start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        spannable.setSpan(
          object : ClickableSpan() {
            override fun onClick(widget: View) {
              emitVocabularyTap(word)
            }

            override fun updateDrawState(ds: android.text.TextPaint) {
              // 不改变颜色和系统下划线，外观仅由虚线 span 控制
            }
          },
          start,
          end,
          Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
        )
        hasClickable = true
        fromIndex = end
      }
    }
    if (hasClickable) {
      movementMethod = LinkMovementMethod.getInstance()
      setTextIsSelectable(true)
    }
    return spannable
  }

  private fun emitVocabularyTap(word: String) {
    val event = Arguments.createMap().apply {
      putString("text", word)
      putString("source", "android")
    }
    reactContext.getJSModule(RCTEventEmitter::class.java).receiveEvent(id, "topVocabularyTap", event)
  }

  private fun emitAnnotationTap(annotationId: String) {
    val event = Arguments.createMap().apply {
      putString("annotationId", annotationId)
      putString("source", "android")
    }
    reactContext.getJSModule(RCTEventEmitter::class.java).receiveEvent(id, "topAnnotationTap", event)
  }

  // 单击命中批注：用按下/抬起位移判定单击（避免与拖动选词、长按冲突），
  // 命中后把触点像素映射到渲染偏移，正查命中的 annotation 并回调。
  private var touchDownX = 0f
  private var touchDownY = 0f
  private var touchDownTime = 0L

  override fun onTouchEvent(event: android.view.MotionEvent): Boolean {
    when (event.action) {
      android.view.MotionEvent.ACTION_DOWN -> {
        touchDownX = event.x
        touchDownY = event.y
        touchDownTime = System.currentTimeMillis()
      }
      android.view.MotionEvent.ACTION_UP -> {
        val dx = event.x - touchDownX
        val dy = event.y - touchDownY
        val moved = (dx * dx + dy * dy) > (24f * 24f)
        val duration = System.currentTimeMillis() - touchDownTime
        if (!moved && duration < 400 && annotations.isNotEmpty()) {
          val offset = renderOffsetForTouch(event.x, event.y)
          if (offset >= 0) {
            val hit = sortedAnnotationsForHitTesting().firstOrNull { ann ->
              val range = sourceToRenderRange(ann.startOffset, ann.endOffset)
              range != null && offset >= range.first && offset < range.second && ann.id != null
            }
            if (hit?.id != null) {
              emitAnnotationTap(hit.id)
            }
          }
        }
      }
    }
    return super.onTouchEvent(event)
  }

  // 触点像素 → 渲染字符偏移
  private fun renderOffsetForTouch(x: Float, y: Float): Int {
    val activeLayout = layout ?: return -1
    val lineY = (y - totalPaddingTop).toInt()
    val line = activeLayout.getLineForVertical(lineY)
    val xInLine = x - totalPaddingLeft
    return activeLayout.getOffsetForHorizontal(line, xInLine)
  }

  private fun emitSelection(action: String) {
    val start = Selection.getSelectionStart(text).coerceAtLeast(0)
    val end = Selection.getSelectionEnd(text).coerceAtLeast(0)
    val selectionStart = minOf(start, end)
    val selectionEnd = maxOf(start, end)
    if (selectionEnd <= selectionStart) {
      return
    }

    val selectedText = text.subSequence(selectionStart, selectionEnd).toString()
    val (sourceStart, sourceEnd) = renderToSourceRange(selectionStart, selectionEnd)
    val event = Arguments.createMap().apply {
      putString("selectedText", selectedText)
      putInt("start", sourceStart)
      putInt("end", sourceEnd)
      putInt("paragraphIndex", paragraphIndexFor(selectionStart))
      putString("source", "android")
      putString("action", action)
    }

    reactContext.getJSModule(RCTEventEmitter::class.java).receiveEvent(id, "topSelection", event)
  }

  private fun paragraphIndexFor(offset: Int): Int {
    return text.substring(0, offset.coerceIn(0, text.length)).count { it == '\n' }
  }

  // 渲染区间 [renderStart, renderEnd) → 原文区间 [sourceStart, sourceEnd)
  private fun renderToSourceRange(renderStart: Int, renderEnd: Int): Pair<Int, Int> {
    if (renderToSource.isEmpty()) return renderStart to renderEnd
    val s = renderStart.coerceIn(0, renderToSource.size - 1)
    val sourceStart = renderToSource[s]
    val sourceEnd = if (renderEnd in 1..renderToSource.size) {
      renderToSource[renderEnd - 1] + 1
    } else {
      renderToSource.last() + 1
    }
    return sourceStart to sourceEnd
  }

  // 原文区间 [sourceStart, sourceEnd) → 渲染区间 [renderStart, renderEnd)
  private fun sourceToRenderRange(sourceStart: Int, sourceEnd: Int): Pair<Int, Int>? {
    if (renderToSource.isEmpty()) return null
    var renderStart = -1
    var renderEnd = -1
    for (i in renderToSource.indices) {
      val src = renderToSource[i]
      if (renderStart == -1 && src >= sourceStart) renderStart = i
      if (src < sourceEnd) renderEnd = i + 1
    }
    if (renderStart == -1 || renderEnd <= renderStart) return null
    return renderStart to renderEnd
  }

  private fun drawAnnotationBackgrounds(canvas: Canvas) {
    if (annotations.isEmpty()) return
    val activeLayout = layout ?: return
    canvas.save()
    canvas.translate(totalPaddingLeft.toFloat(), totalPaddingTop.toFloat())
    for (ann in annotations) {
      if (ann.type == "underline") continue
      val range = sourceToRenderRange(ann.startOffset, ann.endOffset) ?: continue
      highlightPaint.color = (ann.color and 0x00FFFFFF) or (0x55 shl 24)
      forEachLineRect(activeLayout, range.first, range.second) { left, right, line ->
        val top = activeLayout.getLineTop(line).toFloat()
        val bottom = activeLayout.getLineBottom(line).toFloat()
        canvas.drawRect(left, top, right, bottom, highlightPaint)
      }
    }
    canvas.restore()
  }

  private fun drawAnnotationUnderlines(canvas: Canvas) {
    if (annotations.isEmpty()) return
    val activeLayout = layout ?: return
    canvas.save()
    canvas.translate(totalPaddingLeft.toFloat(), totalPaddingTop.toFloat())
    for (ann in annotations) {
      if (ann.type != "underline") continue
      val range = sourceToRenderRange(ann.startOffset, ann.endOffset) ?: continue
      underlinePaint.color = ann.color
      forEachLineRect(activeLayout, range.first, range.second) { left, right, line ->
        val y = activeLayout.getLineBaseline(line).toFloat() + 5f
        canvas.drawLine(left, y, right, y, underlinePaint)
      }
    }
    canvas.restore()
  }

  private fun drawVocabularyDashes(canvas: Canvas) {
    val spanned = text as? Spanned ?: return
    val activeLayout = layout ?: return
    val spans = spanned.getSpans(0, spanned.length, DashedUnderlineSpan::class.java)
    if (spans.isEmpty()) return
    dashPaint.color = currentTextColor and 0x00FFFFFF or (0x8C shl 24)
    canvas.save()
    canvas.translate(totalPaddingLeft.toFloat(), totalPaddingTop.toFloat())
    for (span in spans) {
      val spanStart = spanned.getSpanStart(span)
      val spanEnd = spanned.getSpanEnd(span)
      if (spanStart < 0 || spanEnd <= spanStart) continue
      forEachLineRect(activeLayout, spanStart, spanEnd) { left, right, line ->
        val baselineY = activeLayout.getLineBaseline(line).toFloat() + 4f
        canvas.drawLine(left, baselineY, right, baselineY, dashPaint)
      }
    }
    canvas.restore()
  }

  // 把渲染区间按行拆分，回调每行的左右像素位置
  private inline fun forEachLineRect(
    activeLayout: android.text.Layout,
    renderStart: Int,
    renderEnd: Int,
    block: (left: Float, right: Float, line: Int) -> Unit
  ) {
    val startLine = activeLayout.getLineForOffset(renderStart)
    val endLine = activeLayout.getLineForOffset(renderEnd)
    for (line in startLine..endLine) {
      val lineStart = if (line == startLine) renderStart else activeLayout.getLineStart(line)
      val lineEnd = if (line == endLine) renderEnd else activeLayout.getLineEnd(line)
      val left = activeLayout.getPrimaryHorizontal(lineStart)
      val right = activeLayout.getPrimaryHorizontal(lineEnd)
      block(left, right, line)
    }
  }

  private fun renderMarkdown(markdown: String): SpannableString {
    val result = MarkdownRenderer.render(markdown)
    renderToSource = result.renderToSource
    return result.spannable
  }

  // Keep this hit-test priority aligned with src/utils/annotationHitTesting.ts:
  // shorter ranges win; equal-length ranges with later start offsets win; exact ties keep input order.
  private fun sortedAnnotationsForHitTesting(): List<AnnotationRange> =
    annotations
      .mapIndexed { index, annotation -> IndexedAnnotationRange(index, annotation) }
      .sortedWith(
        compareBy<IndexedAnnotationRange> { it.annotation.endOffset - it.annotation.startOffset }
          .thenByDescending { it.annotation.startOffset }
          .thenBy { it.index }
      )
      .map { it.annotation }

  private data class AnnotationRange(
    val startOffset: Int,
    val endOffset: Int,
    val type: String,
    val color: Int,
    val id: String?
  )

  private data class IndexedAnnotationRange(
    val index: Int,
    val annotation: AnnotationRange
  )
}

/**
 * 虚线下划线标记 Span：本身不改变文字外观，仅用于在 onDraw 阶段被定位，
 * 由 TextView 自行在词条下方绘制真实虚线。
 */
private class DashedUnderlineSpan : android.text.style.CharacterStyle(), UpdateAppearance {
  override fun updateDrawState(tp: android.text.TextPaint) {
    // 不改变文字外观；虚线由 SelectableMarkdownView.onDraw 绘制。
  }
}
