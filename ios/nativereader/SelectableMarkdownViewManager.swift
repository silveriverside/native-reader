import React
import UIKit

@objc(SelectableMarkdownViewManager)
class SelectableMarkdownViewManager: RCTViewManager {
  override func view() -> UIView! {
    return SelectableMarkdownNativeView()
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
