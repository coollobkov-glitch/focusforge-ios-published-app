/**
 * FocusForge Shield Configuration Extension
 *
 * Customizes the shield screen shown when a blocked app is opened.
 * Shows a motivational message and an "Open FocusForge" button.
 */

import ManagedSettings
import ManagedSettingsUI
import UIKit

class ShieldConfigurationExtension: ShieldConfigurationDataSource {

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    return ShieldConfiguration(
      backgroundBlurStyle: .systemThickMaterial,
      backgroundColor: UIColor(red: 0.012, green: 0.043, blue: 0.071, alpha: 1.0), // #030712
      icon: UIImage(systemName: "hourglass"),
      title: ShieldConfiguration.Label(
        text: "Stay Focused",
        color: .white
      ),
      subtitle: ShieldConfiguration.Label(
        text: "Open FocusForge to check your tasks and unlock this app.",
        color: UIColor(white: 0.8, alpha: 1.0)
      ),
      primaryButtonLabel: ShieldConfiguration.Label(
        text: "Open FocusForge",
        color: .white
      ),
      primaryButtonBackgroundColor: UIColor(red: 0.23, green: 0.51, blue: 1.0, alpha: 1.0), // blue
      secondaryButtonLabel: ShieldConfiguration.Label(
        text: "OK",
        color: UIColor(white: 0.6, alpha: 1.0)
      )
    )
  }

  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    return configuration(shielding: application)
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    return ShieldConfiguration(
      backgroundBlurStyle: .systemThickMaterial,
      backgroundColor: UIColor(red: 0.012, green: 0.043, blue: 0.071, alpha: 1.0),
      icon: UIImage(systemName: "hourglass"),
      title: ShieldConfiguration.Label(
        text: "Stay Focused",
        color: .white
      ),
      subtitle: ShieldConfiguration.Label(
        text: "Open FocusForge to check your tasks and unlock this site.",
        color: UIColor(white: 0.8, alpha: 1.0)
      ),
      primaryButtonLabel: ShieldConfiguration.Label(
        text: "Open FocusForge",
        color: .white
      ),
      primaryButtonBackgroundColor: UIColor(red: 0.23, green: 0.51, blue: 1.0, alpha: 1.0),
      secondaryButtonLabel: ShieldConfiguration.Label(
        text: "OK",
        color: UIColor(white: 0.6, alpha: 1.0)
      )
    )
  }

  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
    return configuration(shielding: webDomain)
  }
}
