/**
 * FocusForge Shield Configuration — iOS
 * 
 * This defines the overlay screen that appears when a user tries to open
 * a blocked app. It's the "FocusForge blocking screen" that replaces the app.
 * 
 * Requires: ShieldConfiguration extension target in Xcode
 */

import ManagedSettings
import UIKit

// This class must be in a Shield Configuration Extension target
// Create one in Xcode: File > New > Target > Shield Configuration Extension

class FocusForgeShieldConfiguration: ShieldConfigurationDataSource {
  
  override func configuration(shielding application: Application) -> ShieldConfiguration {
    // Customize the blocking overlay
    return ShieldConfiguration(
      backgroundBlurStyle: .systemUltraThinMaterialDark,
      backgroundColor: UIColor(red: 0.012, green: 0.027, blue: 0.071, alpha: 1.0), // #030712
      icon: UIImage(named: "ShieldIcon"),
      title: ShieldConfiguration.Label(
        text: "Stay Focused",
        color: UIColor.white
      ),
      subtitle: ShieldConfiguration.Label(
        text: "This app is blocked by FocusForge. Get back to what matters.",
        color: UIColor(red: 0.6, green: 0.6, blue: 0.7, alpha: 1.0)
      ),
      primaryButtonLabel: ShieldConfiguration.Label(
        text: "Go Back",
        color: UIColor.white
      ),
      primaryButtonBackgroundColor: UIColor(red: 0.388, green: 0.4, blue: 0.945, alpha: 1.0), // forge-500
      secondaryButtonLabel: ShieldConfiguration.Label(
        text: "Request More Time",
        color: UIColor(red: 0.388, green: 0.4, blue: 0.945, alpha: 1.0)
      )
    )
  }
  
  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    // Same config for category-level blocking
    return configuration(shielding: application)
  }
  
  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    return ShieldConfiguration(
      backgroundBlurStyle: .systemUltraThinMaterialDark,
      backgroundColor: UIColor(red: 0.012, green: 0.027, blue: 0.071, alpha: 1.0),
      title: ShieldConfiguration.Label(
        text: "Website Blocked",
        color: UIColor.white
      ),
      subtitle: ShieldConfiguration.Label(
        text: "This website is blocked by FocusForge.",
        color: UIColor(red: 0.6, green: 0.6, blue: 0.7, alpha: 1.0)
      ),
      primaryButtonLabel: ShieldConfiguration.Label(
        text: "Go Back",
        color: UIColor.white
      ),
      primaryButtonBackgroundColor: UIColor(red: 0.388, green: 0.4, blue: 0.945, alpha: 1.0)
    )
  }
}
