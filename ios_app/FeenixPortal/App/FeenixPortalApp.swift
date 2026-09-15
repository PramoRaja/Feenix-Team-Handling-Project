import SwiftUI

@main
struct FeenixPortalApp: App {
    init() {
        // Configure global dark appearance matching Feenix brand
        UINavigationBar.appearance().barTintColor = UIColor(red: 11/255, green: 15/255, blue: 25/255, alpha: 1)
        UINavigationBar.appearance().tintColor = UIColor(red: 96/255, green: 165/255, blue: 250/255, alpha: 1)
        
        // Ensure status bar style is light content for dark theme
        UIApplication.shared.statusBarStyle = .lightContent
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.dark)
                .background(Color(red: 11/255, green: 15/255, blue: 25/255))
        }
    }
}