import React
import UIKit

@objc(SelectableMarkdownNativeView)
class SelectableMarkdownNativeView: UITextView, UITextViewDelegate, UIGestureRecognizerDelegate {
  @objc var onSelection: RCTDirectEventBlock?
  @objc var onVocabularyTap: RCTDirectEventBlock?
  @objc var onAnnotationTap: RCTDirectEventBlock?

  private var textColorValue: UIColor = UIColor(red: 0.10, green: 0.10, blue: 0.10, alpha: 1.0)
  /** 学习本词条文本列表，用于在渲染后的纯文本里查找并画虚线 */
  private var highlightTexts: [String] = []
  /** 批注区间（原文偏移）+ 类型/颜色/id */
  private var annotationRanges: [AnnotationRange] = []
  /** 渲染后第 i 个字符 → 原文（传入的 markdown）字符下标 */
  private var renderToSource: [Int] = []
  private var lastHandledTapTimestamp: TimeInterval = 0

  struct AnnotationRange {
    let startOffset: Int
    let endOffset: Int
    let type: String
    let color: UIColor
    let id: String?
  }

  @objc var markdown: NSString = "" {
    didSet {
      rerender()
    }
  }

  @objc var highlights: NSArray = [] {
    didSet {
      highlightTexts = highlights.compactMap { entry in
        guard let dict = entry as? NSDictionary,
              let text = dict["text"] as? String,
              !text.isEmpty else {
          return nil
        }
        return text
      }
      rerender()
    }
  }

  @objc var annotations: NSArray = [] {
    didSet {
      annotationRanges = annotations.compactMap { entry in
        guard let dict = entry as? NSDictionary,
              let start = (dict["startOffset"] as? NSNumber)?.intValue,
              let end = (dict["endOffset"] as? NSNumber)?.intValue,
              end > start else {
          return nil
        }
        let type = (dict["type"] as? String) ?? "highlight"
        let colorHex = dict["color"] as? String
        let color = Self.colorFromHex(colorHex ?? "") ?? UIColor(red: 1, green: 0.92, blue: 0.23, alpha: 1)
        let annId = dict["id"] as? String
        return AnnotationRange(startOffset: start, endOffset: end, type: type, color: color, id: annId)
      }
      rerender()
    }
  }

  @objc var markdownTextColor: NSString = "" {
    didSet {
      if let color = Self.colorFromHex(String(markdownTextColor)) {
        textColorValue = color
        rerender()
      }
    }
  }

  @objc var readerBackgroundColor: NSString = "" {
    didSet {
      if let color = Self.colorFromHex(String(readerBackgroundColor)) {
        backgroundColor = color
      }
    }
  }

  override init(frame: CGRect, textContainer: NSTextContainer?) {
    super.init(frame: frame, textContainer: textContainer)
    configure()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    configure()
  }

  private func configure() {
    delegate = self
    isEditable = false
    isSelectable = true
    isScrollEnabled = true
    backgroundColor = .clear
    textContainerInset = UIEdgeInsets(top: 0, left: 0, bottom: 0, right: 0)
    textContainer.lineFragmentPadding = 0
    font = UIFont.systemFont(ofSize: 16)

    let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
    tap.delegate = self
    addGestureRecognizer(tap)
  }

  private func rerender() {
    attributedText = renderMarkdown(String(markdown))
  }

  // 允许单击手势与长按选词手势并存，避免破坏现有选词能力
  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    return true
  }

  // MARK: - 偏移映射

  // 渲染区间 [renderStart, renderEnd) → 原文区间
  private func renderToSourceRange(_ renderStart: Int, _ renderEnd: Int) -> (Int, Int) {
    if renderToSource.isEmpty { return (renderStart, renderEnd) }
    let s = min(max(renderStart, 0), renderToSource.count - 1)
    let sourceStart = renderToSource[s]
    let sourceEnd: Int
    if renderEnd >= 1 && renderEnd <= renderToSource.count {
      sourceEnd = renderToSource[renderEnd - 1] + 1
    } else {
      sourceEnd = (renderToSource.last ?? 0) + 1
    }
    return (sourceStart, sourceEnd)
  }

  // 原文区间 [sourceStart, sourceEnd) → 渲染区间
  private func sourceToRenderRange(_ sourceStart: Int, _ sourceEnd: Int) -> NSRange? {
    if renderToSource.isEmpty { return nil }
    var renderStart = -1
    var renderEnd = -1
    for i in 0..<renderToSource.count {
      let src = renderToSource[i]
      if renderStart == -1 && src >= sourceStart { renderStart = i }
      if src < sourceEnd { renderEnd = i + 1 }
    }
    if renderStart == -1 || renderEnd <= renderStart { return nil }
    return NSRange(location: renderStart, length: renderEnd - renderStart)
  }

  // MARK: - 单击命中

  @objc private func handleTap(_ recognizer: UITapGestureRecognizer) {
    guard recognizer.state == .ended else { return }
    let point = recognizer.location(in: self)
    handleTapPoint(point)
  }

  private func handleTapPoint(_ point: CGPoint) {
    let now = CACurrentMediaTime()
    if now - lastHandledTapTimestamp < 0.15 {
      return
    }
    let currentSelection = selectedRange
    if currentSelection.location != NSNotFound && currentSelection.length > 0 {
      return
    }
    // 1) 优先命中批注
    if let annId = annotationId(at: point) {
      emitAnnotationTap(annId)
      return
    }

    lastHandledTapTimestamp = now

    // 2) 命中学习本词条虚线
    guard highlightTexts.isEmpty == false else { return }
    guard let position = closestPosition(to: point),
          let range = tokenizer.rangeEnclosingPosition(
            position, with: .word, inDirection: UITextDirection(rawValue: 1)
          ) else {
      return
    }
    let location = offset(from: beginningOfDocument, to: range.start)
    let length = offset(from: range.start, to: range.end)
    guard length > 0 else { return }
    let nsText = (text ?? "") as NSString
    guard location >= 0, location + length <= nsText.length else { return }
    let tappedWord = nsText.substring(with: NSRange(location: location, length: length))
    if let matched = matchedHighlight(at: location, length: length, in: nsText) {
      onVocabularyTap?(["text": matched, "source": "ios"])
    } else if highlightTexts.contains(tappedWord) {
      onVocabularyTap?(["text": tappedWord, "source": "ios"])
    }
  }

  private func emitAnnotationTap(_ annotationId: String) {
    lastHandledTapTimestamp = CACurrentMediaTime()
    onAnnotationTap?(["annotationId": annotationId, "source": "ios"])
  }

  private func closestRenderIndex(to point: CGPoint) -> Int {
    guard let position = closestPosition(to: point) else { return -1 }
    return offset(from: beginningOfDocument, to: position)
  }

  // 在所有词条命中区间里，判断点击的字符范围是否落入其中
  private func matchedHighlight(at location: Int, length: Int, in nsText: NSString) -> String? {
    for highlight in highlightTexts {
      var searchRange = NSRange(location: 0, length: nsText.length)
      while searchRange.location < nsText.length {
        let found = nsText.range(of: highlight, options: [], range: searchRange)
        if found.location == NSNotFound { break }
        if location >= found.location && location + length <= found.location + found.length {
          return highlight
        }
        searchRange.location = found.location + max(found.length, 1)
        searchRange.length = nsText.length - searchRange.location
      }
    }
    return nil
  }

  private func annotationId(at viewPoint: CGPoint) -> String? {
    guard annotationRanges.isEmpty == false, attributedText.length > 0 else { return nil }
    layoutManager.ensureLayout(for: textContainer)
    let textPoint = CGPoint(
      x: viewPoint.x - textContainerInset.left + contentOffset.x,
      y: viewPoint.y - textContainerInset.top + contentOffset.y
    )

    // Keep this hit-test priority aligned with src/utils/annotationHitTesting.ts:
    // shorter ranges win; equal-length ranges with later start offsets win; exact ties keep input order.
    let hitTestRanges = annotationRanges.enumerated().sorted { lhs, rhs in
      let lhsAnnotation = lhs.element
      let rhsAnnotation = rhs.element
      let lhsLength = lhsAnnotation.endOffset - lhsAnnotation.startOffset
      let rhsLength = rhsAnnotation.endOffset - rhsAnnotation.startOffset
      if lhsLength != rhsLength {
        return lhsLength < rhsLength
      }
      if lhsAnnotation.startOffset != rhsAnnotation.startOffset {
        return lhsAnnotation.startOffset > rhsAnnotation.startOffset
      }
      return lhs.offset < rhs.offset
    }.map(\.element)

    for ann in hitTestRanges {
      guard let annotationId = ann.id,
            let charRange = sourceToRenderRange(ann.startOffset, ann.endOffset),
            charRange.location >= 0,
            charRange.location + charRange.length <= attributedText.length else {
        continue
      }

      let glyphRange = layoutManager.glyphRange(forCharacterRange: charRange, actualCharacterRange: nil)
      var matched = false
      layoutManager.enumerateLineFragments(forGlyphRange: glyphRange) { _, _, _, lineGlyphRange, _ in
        let hitGlyphRange = NSIntersectionRange(glyphRange, lineGlyphRange)
        guard hitGlyphRange.length > 0 else { return }
        var rect = self.layoutManager.boundingRect(forGlyphRange: hitGlyphRange, in: self.textContainer)
        rect = rect.insetBy(dx: -6, dy: -6)
        rect.size.height = max(rect.size.height, 28)
        if rect.contains(textPoint) {
          matched = true
        }
      }
      if matched { return annotationId }
    }
    return nil
  }

  // MARK: - 选区回调（返回原文偏移）

  func textViewDidChangeSelection(_ textView: UITextView) {
    let range = selectedRange
    guard range.length > 0, range.location != NSNotFound else {
      return
    }
    let nsText = (textView.text ?? "") as NSString
    guard range.location + range.length <= nsText.length else {
      return
    }
    let selected = nsText.substring(with: range)
    let (sourceStart, sourceEnd) = renderToSourceRange(range.location, range.location + range.length)
    onSelection?([
      "selectedText": selected,
      "start": sourceStart,
      "end": sourceEnd,
      "paragraphIndex": Self.paragraphIndex(in: nsText as String, offset: range.location),
      "source": "ios",
      "action": "selectionChanged",
    ])
  }

  private static func paragraphIndex(in text: String, offset: Int) -> Int {
    let safeOffset = max(0, min(offset, text.count))
    let prefix = String(text.prefix(safeOffset))
    return prefix.filter { $0 == "\n" }.count
  }

  // MARK: - 渲染（构建渲染↔原文映射）

  private func renderMarkdown(_ markdown: String) -> NSAttributedString {
    let result = NSMutableAttributedString()
    var sourceMap: [Int] = []
    let nsSource = markdown as NSString
    var lineStart = 0

    let lines = markdown.components(separatedBy: "\n")
    for (lineIndex, line) in lines.enumerated() {
      if lineIndex > 0 {
        result.append(NSAttributedString(string: "\n", attributes: [.font: UIFont.systemFont(ofSize: 16), .foregroundColor: textColorValue]))
        sourceMap.append(lineStart - 1)
      }
      appendLine(line, lineStart: lineStart, into: result, sourceMap: &sourceMap)
      lineStart += (line as NSString).length + 1
    }

    renderToSource = sourceMap
    applyHighlightUnderlines(to: result)
    applyAnnotationAttributes(to: result)
    _ = nsSource
    return result
  }

  private func appendLine(
    _ line: String,
    lineStart: Int,
    into result: NSMutableAttributedString,
    sourceMap: inout [Int]
  ) {
    let baseFont = UIFont.systemFont(ofSize: 16)
    let headingFont = UIFont.boldSystemFont(ofSize: 22)
    let boldFont = UIFont.boldSystemFont(ofSize: 16)
    let italicFont = UIFont.italicSystemFont(ofSize: 16)

    let chars = Array(line)
    var local = 0
    var isHeading = false

    // 行首清洗：标题/列表/引用
    if let m = line.range(of: "^#{1,6}\\s+", options: .regularExpression) {
      local = line.distance(from: line.startIndex, to: m.upperBound)
      isHeading = true
    } else if let m = line.range(of: "^[-*+]\\s+", options: .regularExpression) {
      // 插入项目符号，映射到行首
      result.append(NSAttributedString(string: "• ", attributes: [.font: baseFont, .foregroundColor: textColorValue]))
      sourceMap.append(lineStart)
      sourceMap.append(lineStart)
      local = line.distance(from: line.startIndex, to: m.upperBound)
    } else if let m = line.range(of: "^>\\s?", options: .regularExpression) {
      local = line.distance(from: line.startIndex, to: m.upperBound)
    }

    let bodyFont = isHeading ? headingFont : baseFont

    func appendChar(_ ch: Character, sourceIndex: Int, font: UIFont) {
      result.append(NSAttributedString(string: String(ch), attributes: [.font: font, .foregroundColor: textColorValue]))
      sourceMap.append(lineStart + sourceIndex)
    }

    var i = local
    while i < chars.count {
      // **bold**
      if i + 1 < chars.count && chars[i] == "*" && chars[i + 1] == "*" {
        if let close = findClose(chars, from: i + 2, marker: "**") {
          var k = i + 2
          while k < close {
            appendChar(chars[k], sourceIndex: k, font: boldFont)
            k += 1
          }
          i = close + 2
          continue
        }
      }
      // *italic*
      if chars[i] == "*" {
        if let close = findCloseSingle(chars, from: i + 1) {
          var k = i + 1
          while k < close {
            appendChar(chars[k], sourceIndex: k, font: italicFont)
            k += 1
          }
          i = close + 1
          continue
        }
      }
      appendChar(chars[i], sourceIndex: i, font: bodyFont)
      i += 1
    }
  }

  private func findClose(_ chars: [Character], from: Int, marker: String) -> Int? {
    var i = from
    while i + 1 < chars.count {
      if chars[i] == "*" && chars[i + 1] == "*" { return i }
      i += 1
    }
    return nil
  }

  private func findCloseSingle(_ chars: [Character], from: Int) -> Int? {
    var i = from
    while i < chars.count {
      if chars[i] == "*" { return i }
      i += 1
    }
    return nil
  }

  // 学习本词条：虚线下划线
  private func applyHighlightUnderlines(to attributed: NSMutableAttributedString) {
    guard highlightTexts.isEmpty == false else { return }
    let fullText = attributed.string as NSString
    for highlight in highlightTexts {
      guard highlight.isEmpty == false else { continue }
      var searchRange = NSRange(location: 0, length: fullText.length)
      while searchRange.location < fullText.length {
        let found = fullText.range(of: highlight, options: [], range: searchRange)
        if found.location == NSNotFound { break }
        attributed.addAttributes(
          [
            .underlineStyle: NSUnderlineStyle.single.rawValue | NSUnderlineStyle.patternDash.rawValue,
            .underlineColor: textColorValue.withAlphaComponent(0.55),
          ],
          range: found
        )
        searchRange.location = found.location + max(found.length, 1)
        searchRange.length = fullText.length - searchRange.location
      }
    }
  }

  // 批注：高亮背景色 / 实线下划线（用属性渲染，随布局自动定位）
  private func applyAnnotationAttributes(to attributed: NSMutableAttributedString) {
    guard annotationRanges.isEmpty == false else { return }
    let length = attributed.length
    for ann in annotationRanges {
      guard let r = sourceToRenderRange(ann.startOffset, ann.endOffset) else { continue }
      guard r.location >= 0, r.location + r.length <= length else { continue }
      if ann.type == "underline" {
        attributed.addAttributes(
          [
            .underlineStyle: NSUnderlineStyle.thick.rawValue,
            .underlineColor: ann.color,
          ],
          range: r
        )
      } else {
        attributed.addAttribute(.backgroundColor, value: ann.color.withAlphaComponent(0.35), range: r)
      }
    }
  }

  private static func colorFromHex(_ hex: String) -> UIColor? {
    var sanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    sanitized = sanitized.replacingOccurrences(of: "#", with: "")
    guard sanitized.count == 6 || sanitized.count == 8 else { return nil }

    var rgb: UInt64 = 0
    guard Scanner(string: sanitized).scanHexInt64(&rgb) else { return nil }

    let r, g, b, a: CGFloat
    if sanitized.count == 8 {
      r = CGFloat((rgb & 0xFF000000) >> 24) / 255
      g = CGFloat((rgb & 0x00FF0000) >> 16) / 255
      b = CGFloat((rgb & 0x0000FF00) >> 8) / 255
      a = CGFloat(rgb & 0x000000FF) / 255
    } else {
      r = CGFloat((rgb & 0xFF0000) >> 16) / 255
      g = CGFloat((rgb & 0x00FF00) >> 8) / 255
      b = CGFloat(rgb & 0x0000FF) / 255
      a = 1.0
    }
    return UIColor(red: r, green: g, blue: b, alpha: a)
  }
}
