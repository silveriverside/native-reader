import XCTest

final class nativereaderUITests: XCTestCase {
  private let editedNoteText = "Edited note from XCUITest."
  private let longNoteText = "Long note from XCUITest with enough words to exercise a wider comment payload while keeping the reader detail sheet usable."
  private let multilineNoteText = "First line from XCUITest.\nSecond line from XCUITest."

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  private func launchSeededReader(_ app: XCUIApplication) {
    app.launch()
    XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
    sleep(6)
    XCTAssertTrue(app.staticTexts["第1页"].waitForExistence(timeout: 3))
  }

  private func tapSeededKnowledgeAnnotation(_ app: XCUIApplication) {
    let readerTextView = app.textViews.element(boundBy: 0)
    XCTAssertTrue(readerTextView.waitForExistence(timeout: 3))
    readerTextView.coordinate(withNormalizedOffset: CGVector(dx: 0.38, dy: 0.257)).tap()
  }

  private func annotationDetailSheetIsOpen(_ app: XCUIApplication, timeout: TimeInterval = 1) -> Bool {
    let detailSheet = app.otherElements["reader-annotation-detail-sheet"]
    return detailSheet.waitForExistence(timeout: timeout)
  }

  private func openSeededKnowledgeAnnotationDetail(_ app: XCUIApplication) {
    for _ in 0..<3 {
      tapSeededKnowledgeAnnotation(app)
      if annotationDetailSheetIsOpen(app) {
        return
      }

      let bubblePredicate = NSPredicate(format: "label CONTAINS %@", "点击任意处关闭")
      let bubble = app.descendants(matching: .any).matching(bubblePredicate).firstMatch
      if bubble.exists {
        let window = app.windows.element(boundBy: 0)
        XCTAssertTrue(window.exists)
        window.coordinate(withNormalizedOffset: CGVector(dx: 0.08, dy: 0.2)).tap()
      }
      sleep(1)
    }

    XCTFail("Failed to open seeded knowledge annotation detail")
  }

  private func replaceText(in textView: XCUIElement, with replacement: String) {
    XCTAssertTrue(textView.waitForExistence(timeout: 3))
    textView.tap()

    let currentText = (textView.value as? String) ?? ""
    if !currentText.isEmpty {
      textView.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: currentText.count))
    }
    textView.typeText(replacement)
  }

  private func openSeededKnowledgeCommentEditor(_ app: XCUIApplication) -> XCUIElement {
    openSeededKnowledgeAnnotationDetail(app)
    XCTAssertTrue(app.buttons["reader-annotation-edit-comment"].waitForExistence(timeout: 3))
    app.buttons["reader-annotation-edit-comment"].tap()
    let editor = app.textViews["reader-comment-editor-input"]
    XCTAssertTrue(editor.waitForExistence(timeout: 3))
    return editor
  }

  private func assertSeededKnowledgeDetailContains(_ app: XCUIApplication, _ text: String) {
    openSeededKnowledgeAnnotationDetail(app)
    let predicate = NSPredicate(format: "label CONTAINS %@", text)
    let note = app.descendants(matching: .any).matching(predicate).firstMatch
    XCTAssertTrue(note.waitForExistence(timeout: 3))
  }

  func testTappingSeededKnowledgeAnnotationShowsDetailSheet() throws {
    let app = XCUIApplication()
    launchSeededReader(app)
    openSeededKnowledgeAnnotationDetail(app)

    XCTAssertTrue(app.otherElements["reader-annotation-detail-sheet"].waitForExistence(timeout: 3))
  }

  func testTappingOverlappedSeededKnowledgeAnnotationPrefersShortComment() throws {
    let app = XCUIApplication()
    launchSeededReader(app)

    assertSeededKnowledgeDetailContains(app, "Debug note for iOS annotation tap.")
  }

  func testLongPressingSeededKnowledgeAnnotationKeepsSelectionWithoutOpeningDetailSheet() throws {
    let app = XCUIApplication()
    launchSeededReader(app)
    let readerTextView = app.textViews.element(boundBy: 0)
    XCTAssertTrue(readerTextView.waitForExistence(timeout: 3))
    readerTextView.coordinate(withNormalizedOffset: CGVector(dx: 0.38, dy: 0.257)).press(forDuration: 1.2)

    let notePredicate = NSPredicate(format: "label CONTAINS %@", "Debug note for iOS annotation tap.")
    let noteElement = app.descendants(matching: .any).matching(notePredicate).firstMatch
    XCTAssertFalse(noteElement.exists)

    let selectionPredicate = NSPredicate(format: "label BEGINSWITH %@", "选中:")
    let selectionElement = app.staticTexts.matching(selectionPredicate).firstMatch
    XCTAssertTrue(selectionElement.waitForExistence(timeout: 3))
    XCTAssertTrue(selectionElement.label.contains("knowledge"))
  }

  func testEditingThenDeletingSeededKnowledgeAnnotationComment() throws {
    let app = XCUIApplication()
    launchSeededReader(app)

    let editor = openSeededKnowledgeCommentEditor(app)
    replaceText(in: editor, with: editedNoteText)
    app.buttons["reader-comment-editor-save"].tap()

    assertSeededKnowledgeDetailContains(app, editedNoteText)

    XCTAssertTrue(app.buttons["reader-annotation-delete"].waitForExistence(timeout: 3))
    app.buttons["reader-annotation-delete"].tap()

    tapSeededKnowledgeAnnotation(app)
    let editedPredicate = NSPredicate(format: "label CONTAINS %@", editedNoteText)
    let deletedNote = app.descendants(matching: .any).matching(editedPredicate).firstMatch
    XCTAssertFalse(deletedNote.waitForExistence(timeout: 2))
  }

  func testSavingEmptySeededKnowledgeAnnotationCommentKeepsEditorOpen() throws {
    let app = XCUIApplication()
    launchSeededReader(app)

    let editor = openSeededKnowledgeCommentEditor(app)
    replaceText(in: editor, with: "")
    app.buttons["reader-comment-editor-save"].tap()

    let alert = app.alerts["评论为空"]
    XCTAssertTrue(alert.waitForExistence(timeout: 3))
    XCTAssertTrue(app.staticTexts["请输入评论内容。"].exists)
    alert.buttons.firstMatch.tap()
    XCTAssertTrue(app.textViews["reader-comment-editor-input"].waitForExistence(timeout: 3))
  }

  func testEditingSeededKnowledgeAnnotationCommentSupportsLongText() throws {
    let app = XCUIApplication()
    launchSeededReader(app)

    let editor = openSeededKnowledgeCommentEditor(app)
    replaceText(in: editor, with: longNoteText)
    app.buttons["reader-comment-editor-save"].tap()

    assertSeededKnowledgeDetailContains(app, longNoteText)
  }

  func testEditingSeededKnowledgeAnnotationCommentSupportsMultilineText() throws {
    let app = XCUIApplication()
    launchSeededReader(app)

    let editor = openSeededKnowledgeCommentEditor(app)
    replaceText(in: editor, with: multilineNoteText)
    app.buttons["reader-comment-editor-save"].tap()

    assertSeededKnowledgeDetailContains(app, "Second line from XCUITest.")
  }
}
