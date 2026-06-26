package com.anonymous.native_reader.markdownselection

import android.graphics.Typeface
import android.text.SpannableString
import android.text.Spanned
import android.text.style.StyleSpan

/**
 * 极简 Markdown → SpannableString 渲染器，同时构建「渲染字符 ↔ 原文字符」映射。
 *
 * 映射约束：renderToSource[i] = 渲染后第 i 个字符在传入 markdown 原文里的下标，
 * 数组长度严格等于渲染文本长度。选词回调据此反查原文偏移，批注据此正查渲染区间。
 */
object MarkdownRenderer {
  data class RenderResult(
    val spannable: SpannableString,
    val renderToSource: IntArray
  )

  private data class StyleRange(val start: Int, val end: Int, val style: Int)

  fun render(markdown: String): RenderResult {
    val builder = StringBuilder()
    val sourceMap = ArrayList<Int>(markdown.length)
    val spans = mutableListOf<StyleRange>()

    var lineStart = 0
    val lines = markdown.split("\n")
    lines.forEachIndexed { lineIndex, line ->
      if (lineIndex > 0) {
        builder.append('\n')
        sourceMap.add(lineStart - 1)
      }
      appendLine(line, lineStart, builder, sourceMap, spans)
      lineStart += line.length + 1
    }

    val spannable = SpannableString(builder.toString())
    spans.forEach { span ->
      if (span.end <= spannable.length) {
        spannable.setSpan(StyleSpan(span.style), span.start, span.end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
      }
    }
    return RenderResult(spannable, sourceMap.toIntArray())
  }

  // 行首清洗（标题/列表/引用）后做行内解析
  private fun appendLine(
    line: String,
    lineStart: Int,
    builder: StringBuilder,
    sourceMap: MutableList<Int>,
    spans: MutableList<StyleRange>
  ) {
    var local = 0
    val heading = Regex("^#{1,6}\\s+").find(line)
    if (heading != null) {
      local = heading.value.length
    } else {
      val bullet = Regex("^[-*+]\\s+").find(line)
      if (bullet != null) {
        builder.append("• ")
        sourceMap.add(lineStart)
        sourceMap.add(lineStart)
        local = bullet.value.length
      } else {
        val quote = Regex("^>\\s?").find(line)
        if (quote != null) {
          local = quote.value.length
        }
      }
    }
    appendInline(line, local, lineStart, builder, sourceMap, spans)
  }

  private fun appendInline(
    line: String,
    startLocal: Int,
    lineStart: Int,
    builder: StringBuilder,
    sourceMap: MutableList<Int>,
    spans: MutableList<StyleRange>
  ) {
    var index = startLocal
    while (index < line.length) {
      if (line.startsWith("**", index)) {
        val close = line.indexOf("**", startIndex = index + 2)
        if (close >= 0) {
          val start = builder.length
          var k = index + 2
          while (k < close) {
            builder.append(line[k])
            sourceMap.add(lineStart + k)
            k += 1
          }
          spans.add(StyleRange(start, builder.length, Typeface.BOLD))
          index = close + 2
          continue
        }
      }

      if (line[index] == '*') {
        val close = line.indexOf('*', startIndex = index + 1)
        if (close >= 0) {
          val start = builder.length
          var k = index + 1
          while (k < close) {
            builder.append(line[k])
            sourceMap.add(lineStart + k)
            k += 1
          }
          spans.add(StyleRange(start, builder.length, Typeface.ITALIC))
          index = close + 1
          continue
        }
      }

      builder.append(line[index])
      sourceMap.add(lineStart + index)
      index += 1
    }
  }
}
