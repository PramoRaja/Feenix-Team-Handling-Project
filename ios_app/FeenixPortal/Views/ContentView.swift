import SwiftUI

struct ContentView: View {
    @State private var isLoading = true
    @State private var estimatedProgress: Double = 0.0
    @State private var canGoBack = false
    @State private var canGoForward = false
    @State private var hasError = false
    @State private var errorMessage = ""
    @State private var refreshID = UUID()
    
    let portalURL = URL(string: "https://portal.hivelankan.com")!
    
    var body: some View {
        ZStack(alignment: .top) {
            // Background obsidian layer
            Color(red: 11/255, green: 15/255, blue: 25/255)
                .edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 0) {
                // Top Slim Progress Bar
                if isLoading && estimatedProgress < 1.0 {
                    GeometryReader { geometry in
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color(red: 96/255, green: 165/255, blue: 250/255),
                                Color(red: 168/255, green: 85/255, blue: 247/255)
                            ]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(width: geometry.size.width * CGFloat(estimatedProgress), height: 3)
                        .animation(.linear(duration: 0.2), value: estimatedProgress)
                    }
                    .frame(height: 3)
                }
                
                // Web App Content
                if hasError {
                    // Offline / Network Error Fallback
                    VStack(spacing: 20) {
                        Spacer()
                        
                        Image(systemName: "wifi.exclamationmark")
                            .font(.system(size: 60))
                            .foregroundColor(Color(red: 239/255, green: 68/255, blue: 68/255))
                        
                        Text("Connection Error")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)
                        
                        Text(errorMessage.isEmpty ? "Unable to connect to Feenix Portal. Please check your internet connection." : errorMessage)
                            .font(.subheadline)
                            .foregroundColor(Color(red: 148/255, green: 163/255, blue: 184/255))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                        
                        Button(action: {
                            hasError = false
                            refreshID = UUID()
                        }) {
                            HStack {
                                Image(systemName: "arrow.clockwise")
                                Text("Retry Connection")
                            }
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 28)
                            .padding(.vertical, 14)
                            .background(
                                LinearGradient(
                                    colors: [Color(red: 37/255, green: 99/255, blue: 235/255), Color(red: 59/255, green: 130/255, blue: 246/255)],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(12)
                            .shadow(color: Color(red: 37/255, green: 99/255, blue: 235/255).opacity(0.4), radius: 10, y: 5)
                        }
                        
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    WebView(
                        url: portalURL,
                        isLoading: $isLoading,
                        estimatedProgress: $estimatedProgress,
                        canGoBack: $canGoBack,
                        canGoForward: $canGoForward,
                        hasError: $hasError,
                        errorMessage: $errorMessage
                    )
                    .id(refreshID)
                    .edgesIgnoringSafeArea([.leading, .trailing, .bottom])
                }
            }
        }
    }
}