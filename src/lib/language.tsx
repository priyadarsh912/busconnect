import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type AppLanguage = "en" | "hi" | "pa";

type TranslationParams = Record<string, string | number>;

type LanguageContextValue = {
    language: AppLanguage;
    setLanguage: (language: AppLanguage) => void;
    t: (key: string, params?: TranslationParams) => string;
};

const STORAGE_KEY = "appLanguage";

const translations: Record<AppLanguage, Record<string, string>> = {
    en: {
        "bottomNav.home": "Home",
        "bottomNav.routes": "Routes",
        "bottomNav.tracking": "Tracking",
        "bottomNav.radar": "Radar",
        "bottomNav.profile": "Profile",

        "settings.title": "Select Language",
        "settings.suggestedLanguages": "SUGGESTED LANGUAGES",
        "settings.defaultSystemLanguage": "Default system language",
        "settings.applyChanges": "Apply Changes",
        "settings.languageUpdated": "Language updated",
        "settings.languageUpdatedDescription": "The app language changed successfully.",

        "home.searchPlaceholder": "Search sectors or phases (e.g. Sector 17)...",
        "home.selectState": "Select Your State",
        "home.active": "ACTIVE",
        "home.comingSoonBadge": "COMING SOON",
        "home.comingSoonTitle": "Coming Soon",
        "home.comingSoonSubtitle": "Expanding to South India shortly",
        "home.bannerTitle": "Kerala & Karnataka",
        "home.bannerStatus": "UNDER PLANNING",
        "home.state.chandigarh": "The City Beautiful",
        "home.state.punjab": "Land of Five Rivers",
        "home.state.haryana": "Abode of God",
        "home.state.delhi": "National Capital Territory",
        "home.state.uttarPradesh": "Heart of Northern India",
        "home.state.uttarakhand": "Land of the Gods",
        "home.state.himachalPradesh": "Land of Mountains",
        "home.state.rajasthan": "Land of Kings",
        "home.state.jammuKashmir": "Paradise on Earth",
        "home.state.madhyaPradesh": "Heart of India",

        "tripType.title": "Select Trip Type",
        "tripType.subtitle": "{state} • Choose how you'd like to travel",
        "tripType.intercityLabel": "Intercity",
        "tripType.intercityDescription": "Travel within nearby cities of the selected state.",
        "tripType.intercityBadge": "Short Distance  •  ≤ 35 km",
        "tripType.outstationLabel": "Outstation",
        "tripType.outstationDescription": "Travel to cities outside the state or long-distance routes.",
        "tripType.outstationBadge": "Long Distance  •  > 35 km",
        "tripType.tipLabel": "Tip:",
        "tripType.tipBody": "Choose Intercity for short, frequent city-to-city hops. Choose Outstation for longer journeys across state borders.",

        "routes.intercity": "Intercity",
        "routes.outstation": "Outstation",
        "routes.sectorWiseLocalRoutes": "Sector-wise local routes",
        "routes.loading": "Loading…",
        "routes.routesFound": "{count} routes found",
        "routes.fetching": "Fetching routes…",
        "routes.noBusesFound": "No Buses Found",
        "routes.noBusesBetween": "No {tripType} buses found from {origin} to {destination}.",
        "routes.noRoutesForState": "No {tripType} routes found for {state}.",
        "routes.changeRoute": "Change Route",
        "routes.nearbyRoutesFrom": "Nearby routes from {origin}",

        "tracking.routeDataUnavailable": "Route data unavailable",
        "tracking.preciseTrackingMissing": "Precise tracking coordinates for this Chandigarh region route are currently missing.",
        "tracking.returnToRoutes": "Return to Routes",
        "tracking.title": "Tracking Route",
        "tracking.getStarted": "Get Started tracking",
        "tracking.getStartedBody": "Select one of the popular routes below to see live tracking, crowd levels, and road-calibrated ETA.",
        "tracking.currentStatus": "CURRENT STATUS",
        "tracking.onTime": "On Time",
        "tracking.nextStop": "NEXT STOP",
        "tracking.calculating": "Calculating...",
        "tracking.arrivingIn": "Arriving in {minutes} mins",
        "tracking.routeTimeline": "ROUTE TIMELINE",

        "radar.title": "Highway Radar",
        "radar.subtitle": "Nearby long-distance buses",
        "radar.all": "All",
        "radar.short": "Short (3-5km)",
        "radar.long": "Long (10-15km)",
        "radar.locationNotSupported": "Location not supported.",
        "radar.locationUnavailable": "Could not get location.",

        "account.title": "Account",
        "account.editProfile": "Edit Profile",
        "account.fullName": "Full Name",
        "account.emailAddress": "Email Address",
        "account.phoneNumber": "Phone Number",
        "account.password": "Password",
        "account.saveChanges": "Save Changes",
        "account.travelManagement": "TRAVEL MANAGEMENT",
        "account.application": "APPLICATION",
        "account.myBookings": "My Bookings",
        "account.savedRoutes": "Saved Routes",
        "account.settings": "Settings",
        "account.helpSupport": "Help & Support",
        "account.logOut": "Log Out",
        "account.nameRequired": "Name is required",
        "account.validEmailRequired": "Valid email is required",
        "account.phoneRequired": "Phone number is required",
        "account.passwordLength": "Password must be at least 6 characters",
        "account.profileUpdated": "Profile updated successfully!",
        "account.loggedOut": "Logged out successfully",
        "account.yourFullName": "Your full name",
        "account.minSixCharacters": "Min 6 characters",
    },
    hi: {
        "bottomNav.home": "होम",
        "bottomNav.routes": "रूट्स",
        "bottomNav.tracking": "ट्रैकिंग",
        "bottomNav.radar": "रडार",
        "bottomNav.profile": "प्रोफाइल",

        "settings.title": "भाषा चुनें",
        "settings.suggestedLanguages": "सुझाई गई भाषाएं",
        "settings.defaultSystemLanguage": "डिफ़ॉल्ट सिस्टम भाषा",
        "settings.applyChanges": "बदलाव लागू करें",
        "settings.languageUpdated": "भाषा अपडेट हो गई",
        "settings.languageUpdatedDescription": "ऐप की भाषा सफलतापूर्वक बदल गई है।",

        "home.searchPlaceholder": "सेक्टर या फेज खोजें (जैसे सेक्टर 17)...",
        "home.selectState": "अपना राज्य चुनें",
        "home.active": "सक्रिय",
        "home.comingSoonBadge": "जल्द आ रहा है",
        "home.comingSoonTitle": "जल्द आ रहा है",
        "home.comingSoonSubtitle": "जल्द ही दक्षिण भारत तक विस्तार",
        "home.bannerTitle": "केरल और कर्नाटक",
        "home.bannerStatus": "योजना में",
        "home.state.chandigarh": "सुंदर शहर",
        "home.state.punjab": "पांच नदियों की भूमि",
        "home.state.haryana": "भगवान का निवास",
        "home.state.delhi": "राष्ट्रीय राजधानी क्षेत्र",
        "home.state.uttarPradesh": "उत्तर भारत का हृदय",
        "home.state.uttarakhand": "देवभूमि",
        "home.state.himachalPradesh": "पहाड़ों की भूमि",
        "home.state.rajasthan": "राजाओं की भूमि",
        "home.state.jammuKashmir": "धरती का स्वर्ग",
        "home.state.madhyaPradesh": "भारत का हृदय",

        "tripType.title": "यात्रा का प्रकार चुनें",
        "tripType.subtitle": "{state} • अपनी यात्रा का तरीका चुनें",
        "tripType.intercityLabel": "इंटरसिटी",
        "tripType.intercityDescription": "चयनित राज्य के नज़दीकी शहरों के भीतर यात्रा करें।",
        "tripType.intercityBadge": "छोटी दूरी  •  ≤ 35 किमी",
        "tripType.outstationLabel": "आउटस्टेशन",
        "tripType.outstationDescription": "राज्य के बाहर या लंबी दूरी के शहरों तक यात्रा करें।",
        "tripType.outstationBadge": "लंबी दूरी  •  > 35 किमी",
        "tripType.tipLabel": "सुझाव:",
        "tripType.tipBody": "छोटी और बार-बार होने वाली शहर-से-शहर यात्रा के लिए इंटरसिटी चुनें। राज्य सीमाओं के पार लंबी यात्रा के लिए आउटस्टेशन चुनें।",

        "routes.intercity": "इंटरसिटी",
        "routes.outstation": "आउटस्टेशन",
        "routes.sectorWiseLocalRoutes": "सेक्टर आधारित स्थानीय रूट्स",
        "routes.loading": "लोड हो रहा है…",
        "routes.routesFound": "{count} रूट मिले",
        "routes.fetching": "रूट्स लाए जा रहे हैं…",
        "routes.noBusesFound": "कोई बस नहीं मिली",
        "routes.noBusesBetween": "{origin} से {destination} तक कोई {tripType} बस नहीं मिली।",
        "routes.noRoutesForState": "{state} के लिए कोई {tripType} रूट नहीं मिला।",
        "routes.changeRoute": "रूट बदलें",
        "routes.nearbyRoutesFrom": "{origin} से नज़दीकी रूट्स",

        "tracking.routeDataUnavailable": "रूट डेटा उपलब्ध नहीं है",
        "tracking.preciseTrackingMissing": "चंडीगढ़ क्षेत्र के इस रूट के लिए सटीक ट्रैकिंग निर्देशांक उपलब्ध नहीं हैं।",
        "tracking.returnToRoutes": "रूट्स पर वापस जाएं",
        "tracking.title": "रूट ट्रैकिंग",
        "tracking.getStarted": "ट्रैकिंग शुरू करें",
        "tracking.getStartedBody": "लाइव ट्रैकिंग, भीड़ स्तर और सड़क आधारित ETA देखने के लिए नीचे दिए गए लोकप्रिय रूट्स में से एक चुनें।",
        "tracking.currentStatus": "वर्तमान स्थिति",
        "tracking.onTime": "समय पर",
        "tracking.nextStop": "अगला स्टॉप",
        "tracking.calculating": "गणना हो रही है...",
        "tracking.arrivingIn": "{minutes} मिनट में पहुंचेगी",
        "tracking.routeTimeline": "रूट टाइमलाइन",

        "radar.title": "हाइवे रडार",
        "radar.subtitle": "नज़दीकी लंबी दूरी की बसें",
        "radar.all": "सभी",
        "radar.short": "शॉर्ट (3-5किमी)",
        "radar.long": "लॉन्ग (10-15किमी)",
        "radar.locationNotSupported": "लोकेशन समर्थित नहीं है।",
        "radar.locationUnavailable": "लोकेशन प्राप्त नहीं हो सकी।",

        "account.title": "खाता",
        "account.editProfile": "प्रोफाइल संपादित करें",
        "account.fullName": "पूरा नाम",
        "account.emailAddress": "ईमेल पता",
        "account.phoneNumber": "फोन नंबर",
        "account.password": "पासवर्ड",
        "account.saveChanges": "बदलाव सहेजें",
        "account.travelManagement": "यात्रा प्रबंधन",
        "account.application": "एप्लिकेशन",
        "account.myBookings": "मेरी बुकिंग",
        "account.savedRoutes": "सहेजे गए रूट्स",
        "account.settings": "सेटिंग्स",
        "account.helpSupport": "मदद और सहायता",
        "account.logOut": "लॉग आउट",
        "account.nameRequired": "नाम आवश्यक है",
        "account.validEmailRequired": "मान्य ईमेल आवश्यक है",
        "account.phoneRequired": "फोन नंबर आवश्यक है",
        "account.passwordLength": "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए",
        "account.profileUpdated": "प्रोफाइल सफलतापूर्वक अपडेट हो गई!",
        "account.loggedOut": "सफलतापूर्वक लॉग आउट हो गया",
        "account.yourFullName": "अपना पूरा नाम",
        "account.minSixCharacters": "कम से कम 6 अक्षर",
    },
    pa: {
        "bottomNav.home": "ਹੋਮ",
        "bottomNav.routes": "ਰੂਟਸ",
        "bottomNav.tracking": "ਟ੍ਰੈਕਿੰਗ",
        "bottomNav.radar": "ਰਡਾਰ",
        "bottomNav.profile": "ਪ੍ਰੋਫਾਈਲ",

        "settings.title": "ਭਾਸ਼ਾ ਚੁਣੋ",
        "settings.suggestedLanguages": "ਸੁਝਾਈਆਂ ਭਾਸ਼ਾਵਾਂ",
        "settings.defaultSystemLanguage": "ਡਿਫਾਲਟ ਸਿਸਟਮ ਭਾਸ਼ਾ",
        "settings.applyChanges": "ਬਦਲਾਅ ਲਾਗੂ ਕਰੋ",
        "settings.languageUpdated": "ਭਾਸ਼ਾ ਅਪਡੇਟ ਹੋ ਗਈ",
        "settings.languageUpdatedDescription": "ਐਪ ਦੀ ਭਾਸ਼ਾ ਸਫਲਤਾਪੂਰਵਕ ਬਦਲ ਗਈ ਹੈ।",

        "home.searchPlaceholder": "ਸੈਕਟਰ ਜਾਂ ਫੇਜ਼ ਖੋਜੋ (ਉਦਾਹਰਨ: ਸੈਕਟਰ 17)...",
        "home.selectState": "ਆਪਣਾ ਰਾਜ ਚੁਣੋ",
        "home.active": "ਸਕ੍ਰਿਆ",
        "home.comingSoonBadge": "ਜਲਦੀ ਆ ਰਿਹਾ ਹੈ",
        "home.comingSoonTitle": "ਜਲਦੀ ਆ ਰਿਹਾ ਹੈ",
        "home.comingSoonSubtitle": "ਜਲਦੀ ਹੀ ਦੱਖਣੀ ਭਾਰਤ ਤੱਕ ਵਿਸਥਾਰ",
        "home.bannerTitle": "ਕੇਰਲ ਅਤੇ ਕਰਨਾਟਕ",
        "home.bannerStatus": "ਯੋਜਨਾ ਹੇਠ",
        "home.state.chandigarh": "ਸੁੰਦਰ ਸ਼ਹਿਰ",
        "home.state.punjab": "ਪੰਜ ਦਰਿਆਵਾਂ ਦੀ ਧਰਤੀ",
        "home.state.haryana": "ਰੱਬ ਦਾ ਨਿਵਾਸ",
        "home.state.delhi": "ਰਾਸ਼ਟਰੀ ਰਾਜਧਾਨੀ ਖੇਤਰ",
        "home.state.uttarPradesh": "ਉੱਤਰੀ ਭਾਰਤ ਦਾ ਦਿਲ",
        "home.state.uttarakhand": "ਦੇਵਤਿਆਂ ਦੀ ਧਰਤੀ",
        "home.state.himachalPradesh": "ਪਹਾੜਾਂ ਦੀ ਧਰਤੀ",
        "home.state.rajasthan": "ਰਾਜਿਆਂ ਦੀ ਧਰਤੀ",
        "home.state.jammuKashmir": "ਧਰਤੀ ਦਾ ਸਵਰਗ",
        "home.state.madhyaPradesh": "ਭਾਰਤ ਦਾ ਦਿਲ",

        "tripType.title": "ਯਾਤਰਾ ਦੀ ਕਿਸਮ ਚੁਣੋ",
        "tripType.subtitle": "{state} • ਤੁਸੀਂ ਕਿਵੇਂ ਯਾਤਰਾ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ ਚੁਣੋ",
        "tripType.intercityLabel": "ਇੰਟਰਸਿਟੀ",
        "tripType.intercityDescription": "ਚੁਣੇ ਗਏ ਰਾਜ ਦੇ ਨੇੜਲੇ ਸ਼ਹਿਰਾਂ ਵਿੱਚ ਯਾਤਰਾ ਕਰੋ।",
        "tripType.intercityBadge": "ਛੋਟੀ ਦੂਰੀ  •  ≤ 35 ਕਿ.ਮੀ.",
        "tripType.outstationLabel": "ਆਉਟਸਟੇਸ਼ਨ",
        "tripType.outstationDescription": "ਰਾਜ ਤੋਂ ਬਾਹਰ ਜਾਂ ਲੰਬੀ ਦੂਰੀ ਵਾਲੇ ਸ਼ਹਿਰਾਂ ਤੱਕ ਯਾਤਰਾ ਕਰੋ।",
        "tripType.outstationBadge": "ਲੰਬੀ ਦੂਰੀ  •  > 35 ਕਿ.ਮੀ.",
        "tripType.tipLabel": "ਟਿਪ:",
        "tripType.tipBody": "ਛੋਟੀਆਂ ਅਤੇ ਵਾਰ-ਵਾਰ ਹੋਣ ਵਾਲੀਆਂ ਸ਼ਹਿਰ-ਤੋਂ-ਸ਼ਹਿਰ ਯਾਤਰਾਵਾਂ ਲਈ ਇੰਟਰਸਿਟੀ ਚੁਣੋ। ਰਾਜ ਸੀਮਾਵਾਂ ਪਾਰ ਲੰਬੀਆਂ ਯਾਤਰਾਵਾਂ ਲਈ ਆਉਟਸਟੇਸ਼ਨ ਚੁਣੋ।",

        "routes.intercity": "ਇੰਟਰਸਿਟੀ",
        "routes.outstation": "ਆਉਟਸਟੇਸ਼ਨ",
        "routes.sectorWiseLocalRoutes": "ਸੈਕਟਰ ਅਧਾਰਿਤ ਸਥਾਨਕ ਰੂਟਸ",
        "routes.loading": "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…",
        "routes.routesFound": "{count} ਰੂਟ ਮਿਲੇ",
        "routes.fetching": "ਰੂਟ ਲਿਆਂਦੇ ਜਾ ਰਹੇ ਹਨ…",
        "routes.noBusesFound": "ਕੋਈ ਬੱਸ ਨਹੀਂ ਮਿਲੀ",
        "routes.noBusesBetween": "{origin} ਤੋਂ {destination} ਲਈ ਕੋਈ {tripType} ਬੱਸ ਨਹੀਂ ਮਿਲੀ।",
        "routes.noRoutesForState": "{state} ਲਈ ਕੋਈ {tripType} ਰੂਟ ਨਹੀਂ ਮਿਲਿਆ।",
        "routes.changeRoute": "ਰੂਟ ਬਦਲੋ",
        "routes.nearbyRoutesFrom": "{origin} ਤੋਂ ਨੇੜਲੇ ਰੂਟਸ",

        "tracking.routeDataUnavailable": "ਰੂਟ ਡਾਟਾ ਉਪਲਬਧ ਨਹੀਂ",
        "tracking.preciseTrackingMissing": "ਚੰਡੀਗੜ੍ਹ ਖੇਤਰ ਦੇ ਇਸ ਰੂਟ ਲਈ ਸਟੀਕ ਟ੍ਰੈਕਿੰਗ ਕੋਆਰਡੀਨੇਟ ਮੌਜੂਦ ਨਹੀਂ ਹਨ।",
        "tracking.returnToRoutes": "ਰੂਟਸ ਵੱਲ ਵਾਪਸ ਜਾਓ",
        "tracking.title": "ਰੂਟ ਟ੍ਰੈਕਿੰਗ",
        "tracking.getStarted": "ਟ੍ਰੈਕਿੰਗ ਸ਼ੁਰੂ ਕਰੋ",
        "tracking.getStartedBody": "ਲਾਈਵ ਟ੍ਰੈਕਿੰਗ, ਭੀੜ ਪੱਧਰ ਅਤੇ ਸੜਕ ਅਧਾਰਿਤ ETA ਦੇਖਣ ਲਈ ਹੇਠਾਂ ਦਿੱਤੇ ਲੋਕਪ੍ਰਿਯ ਰੂਟਸ ਵਿੱਚੋਂ ਇੱਕ ਚੁਣੋ।",
        "tracking.currentStatus": "ਮੌਜੂਦਾ ਸਥਿਤੀ",
        "tracking.onTime": "ਸਮੇਂ ਤੇ",
        "tracking.nextStop": "ਅਗਲਾ ਸਟਾਪ",
        "tracking.calculating": "ਗਿਣਤੀ ਹੋ ਰਹੀ ਹੈ...",
        "tracking.arrivingIn": "{minutes} ਮਿੰਟ ਵਿੱਚ ਪਹੁੰਚੇਗੀ",
        "tracking.routeTimeline": "ਰੂਟ ਟਾਈਮਲਾਈਨ",

        "radar.title": "ਹਾਈਵੇ ਰਡਾਰ",
        "radar.subtitle": "ਨੇੜਲੀਆਂ ਲੰਬੀ ਦੂਰੀ ਵਾਲੀਆਂ ਬੱਸਾਂ",
        "radar.all": "ਸਭ",
        "radar.short": "ਛੋਟੀ (3-5ਕਿਮੀ)",
        "radar.long": "ਲੰਮੀ (10-15ਕਿਮੀ)",
        "radar.locationNotSupported": "ਲੋਕੇਸ਼ਨ ਸਮਰਥਿਤ ਨਹੀਂ ਹੈ।",
        "radar.locationUnavailable": "ਲੋਕੇਸ਼ਨ ਪ੍ਰਾਪਤ ਨਹੀਂ ਹੋ ਸਕੀ।",

        "account.title": "ਖਾਤਾ",
        "account.editProfile": "ਪ੍ਰੋਫਾਈਲ ਸੋਧੋ",
        "account.fullName": "ਪੂਰਾ ਨਾਮ",
        "account.emailAddress": "ਈਮੇਲ ਪਤਾ",
        "account.phoneNumber": "ਫੋਨ ਨੰਬਰ",
        "account.password": "ਪਾਸਵਰਡ",
        "account.saveChanges": "ਬਦਲਾਅ ਸੇਵ ਕਰੋ",
        "account.travelManagement": "ਯਾਤਰਾ ਪ੍ਰਬੰਧਨ",
        "account.application": "ਐਪਲੀਕੇਸ਼ਨ",
        "account.myBookings": "ਮੇਰੀਆਂ ਬੁਕਿੰਗਾਂ",
        "account.savedRoutes": "ਸੰਭਾਲੇ ਰੂਟਸ",
        "account.settings": "ਸੈਟਿੰਗਾਂ",
        "account.helpSupport": "ਮਦਦ ਅਤੇ ਸਹਾਇਤਾ",
        "account.logOut": "ਲਾਗ ਆਊਟ",
        "account.nameRequired": "ਨਾਮ ਲਾਜ਼ਮੀ ਹੈ",
        "account.validEmailRequired": "ਵੈਧ ਈਮੇਲ ਲਾਜ਼ਮੀ ਹੈ",
        "account.phoneRequired": "ਫੋਨ ਨੰਬਰ ਲਾਜ਼ਮੀ ਹੈ",
        "account.passwordLength": "ਪਾਸਵਰਡ ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰਾਂ ਦਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ",
        "account.profileUpdated": "ਪ੍ਰੋਫਾਈਲ ਸਫਲਤਾਪੂਰਵਕ ਅਪਡੇਟ ਹੋ ਗਈ!",
        "account.loggedOut": "ਸਫਲਤਾਪੂਰਵਕ ਲਾਗ ਆਊਟ ਹੋ ਗਿਆ",
        "account.yourFullName": "ਆਪਣਾ ਪੂਰਾ ਨਾਮ",
        "account.minSixCharacters": "ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰ",
    },
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const isAppLanguage = (value: string | null): value is AppLanguage => value === "en" || value === "hi" || value === "pa";

const detectLanguage = (): AppLanguage => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isAppLanguage(saved)) return saved;

    const browserLanguage = navigator.language.toLowerCase();
    if (browserLanguage.startsWith("hi")) return "hi";
    if (browserLanguage.startsWith("pa")) return "pa";
    return "en";
};

const formatTranslation = (template: string, params?: TranslationParams) => {
    if (!params) return template;
    return Object.entries(params).reduce((result, [key, value]) => {
        return result.replaceAll(`{${key}}`, String(value));
    }, template);
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<AppLanguage>(() => detectLanguage());

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, language);
        document.documentElement.lang = language;
    }, [language]);

    const setLanguage = (nextLanguage: AppLanguage) => {
        setLanguageState(nextLanguage);
    };

    const t = (key: string, params?: TranslationParams) => {
        const template = translations[language][key] ?? translations.en[key] ?? key;
        return formatTranslation(template, params);
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};
