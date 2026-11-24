'use strict';
(() => {
  const language=document.getElementById('interface-language');
  const theme=document.getElementById('interface-theme');
  const settings=document.getElementById('settings-dialog');
  document.getElementById('settings-open').onclick=()=>settings.showModal();
  document.getElementById('settings-close').onclick=()=>settings.close();
  const textSize=document.getElementById('interface-text-size');
  const reduceMotion=document.getElementById('interface-reduce-motion');
  function applyReadingPreferences() {
    document.documentElement.dataset.textSize=textSize.value;
    document.documentElement.dataset.reduceMotion=String(reduceMotion.checked);
    save('transitlink-text-size',textSize.value);
    save('transitlink-reduce-motion',String(reduceMotion.checked));
  }
  textSize.value=getSaved('transitlink-text-size')==='large'?'large':'standard';
  reduceMotion.checked=getSaved('transitlink-reduce-motion')==='true';
  textSize.onchange=reduceMotion.onchange=applyReadingPreferences;
  applyReadingPreferences();
  const dictionary=new Map([
    ...`
Text size|எழுத்து அளவு|अक्षर का आकार
Standard|இயல்பானது|सामान्य
Large|பெரியது|बड़ा
Reduce motion|அசைவைக் குறை|एनीमेशन कम करें
Account|கணக்கு|खाता
Choose the language for menus and buttons.|மெனு மற்றும் பொத்தான்களுக்கான மொழியைத் தேர்ந்தெடுக்கவும்.|मेनू और बटन की भाषा चुनें।
Switch between light and dark views.|ஒளி மற்றும் இருள் தோற்றங்களுக்கு இடையே மாறவும்.|हल्के और गहरे रूप के बीच बदलें।
Make labels and directions easier to read.|பெயர்களையும் வழிமுறைகளையும் எளிதாகப் படிக்கலாம்.|लेबल और निर्देश पढ़ना आसान बनाएँ।
Keep decorative lights still.|அலங்கார விளக்குகள் அசையாமல் இருக்கட்டும்.|सजावटी बत्तियाँ स्थिर रखें।
Manage your TransitLink sign-in.|TransitLink உள்நுழைவை நிர்வகிக்கவும்.|TransitLink साइन-इन प्रबंधित करें।
Settings|அமைப்புகள்|सेटिंग्स
Language|மொழி|भाषा
Appearance|தோற்றம்|दिखावट
Dark|இருள்|गहरा
Light|ஒளி|हल्का
Log in|உள்நுழைக|लॉग इन
Log out|வெளியேறு|लॉग आउट
Log in to TransitLink|TransitLink-இல் உள்நுழைக|TransitLink में लॉग इन करें
Continue with Google|Google மூலம் தொடர்க|Google से जारी रखें
Email address|மின்னஞ்சல் முகவரி|ईमेल पता
Email|மின்னஞ்சல்|ईमेल
Password|கடவுச்சொல்|पासवर्ड
Create account|கணக்கை உருவாக்கு|खाता बनाएँ
Reset password|கடவுச்சொல்லை மீட்டமை|पासवर्ड रीसेट करें
Phone number|தொலைபேசி எண்|फ़ोन नंबर
Phone with country code|நாட்டுக் குறியீட்டுடன் தொலைபேசி எண்|देश कोड के साथ फ़ोन नंबर
Send SMS code|SMS குறியீட்டை அனுப்பு|SMS कोड भेजें
Verify code|குறியீட்டைச் சரிபார்|कोड सत्यापित करें
SMS code|SMS குறியீடு|SMS कोड
Use a local profile|இந்தச் சாதனத்தின் சுயவிவரத்தைப் பயன்படுத்து|इस डिवाइस की प्रोफ़ाइल इस्तेमाल करें
Profile name|சுயவிவரப் பெயர்|प्रोफ़ाइल का नाम
Open local profile|உள்ளூர் சுயவிவரத்தைத் திற|स्थानीय प्रोफ़ाइल खोलें
Online sign-in needs Firebase configuration. You can use a local profile in this browser.|இணைய உள்நுழைவுக்கு Firebase அமைப்பு தேவை. இந்த உலாவியில் உள்ளூர் சுயவிவரத்தைப் பயன்படுத்தலாம்.|ऑनलाइन लॉग इन के लिए Firebase सेटअप चाहिए। आप इस ब्राउज़र में स्थानीय प्रोफ़ाइल उपयोग कर सकते हैं।
Close|மூடு|बंद करें
Find your way|உங்கள் வழியைக் கண்டறியுங்கள்|अपना रास्ता खोजें
through Chennai.|சென்னை முழுவதும்.|पूरे चेन्नई में।
From a sunrise at Marina to the ride home, find your way across Chennai. Compare bus, Metro and train journeys, and see where to board and change.|மெரினாவில் சூரிய உதயத்திலிருந்து வீடு திரும்பும் வரை சென்னையில் உங்கள் வழியைக் கண்டறியுங்கள். பேருந்து, மெட்ரோ, ரயில் பயணங்களை ஒப்பிட்டு எங்கு ஏறுவது, மாறுவது என்று பாருங்கள்.|मरीना की सुबह से घर लौटने तक, चेन्नई में अपना रास्ता खोजें। बस, मेट्रो और ट्रेन की यात्राएँ तुलना करें और देखें कहाँ चढ़ना और बदलना है।
Plan a trip|பயணத்தைத் திட்டமிடு|यात्रा की योजना बनाएँ
Just arrived?|இப்போதுதான் வந்தீர்களா?|अभी पहुँचे हैं?
Just arrived in Chennai?|சென்னைக்கு இப்போதுதான் வந்தீர்களா?|चेन्नई में अभी पहुँचे हैं?
Choose where you arrived, then look up your destination by landmark or stop.|வந்த இடத்தைத் தேர்ந்தெடுத்து, செல்ல வேண்டிய இடத்தையோ நிறுத்தத்தையோ தேடுங்கள்.|जहाँ पहुँचे हैं उसे चुनें, फिर गंतव्य या स्टॉप का नाम खोजें।
Where are you going?|எங்கே செல்கிறீர்கள்?|आप कहाँ जा रहे हैं?
Plan & Routes|பயணத் திட்டம்|यात्रा और मार्ग
Stations|நிலையங்கள்|स्टेशन
Station|நிலையம்|स्टेशन
Map|வரைபடம்|नक्शा
Explore|சுற்றிப் பார்|घूमें
Saved trips|சேமித்த பயணங்கள்|सहेजी गई यात्राएँ
From|புறப்படும் இடம்|कहाँ से
To|செல்லும் இடம்|कहाँ तक
Search an area or stop|பகுதி அல்லது நிறுத்தத்தைத் தேடு|इलाका या स्टॉप खोजें
Use my location|என் இருப்பிடத்தைப் பயன்படுத்து|मेरा स्थान इस्तेमाल करें
Swap origin and destination|புறப்படும் இடத்தையும் சேருமிடத்தையும் மாற்று|शुरुआत और गंतव्य बदलें
Route preference|வழித்தட விருப்பம்|मार्ग की प्राथमिकता
Quickest arrival|விரைவான பயணம்|सबसे जल्दी पहुँचना
Fewer transfers|குறைவான மாற்றங்கள்|कम बदलाव
Fewer stops|குறைவான நிறுத்தங்கள்|कम स्टॉप
Departure time (IST, optional)|புறப்படும் நேரம் (IST, விருப்பம்)|प्रस्थान समय (IST, वैकल्पिक)
Leave blank to leave now.|இப்போது புறப்பட வெறுமையாக விடவும்.|अभी निकलने के लिए खाली छोड़ें।
Travel modes|பயண வகைகள்|यात्रा के साधन
MTC Bus|MTC பேருந்து|MTC बस
Metro|மெட்ரோ|मेट्रो
Suburban / MRTS|புறநகர் / MRTS|उपनगरीय / MRTS
Routes and schedules|வழித்தடங்களும் அட்டவணையும்|मार्ग और समय-सारणी
Lines and stations|வழிகளும் நிலையங்களும்|लाइनें और स्टेशन
Train schedules|ரயில் அட்டவணைகள்|ट्रेन समय-सारणी
Via stop|வழியிலுள்ள நிறுத்தம்|बीच का स्टॉप
Via stop and holiday service|இடைநிறுத்தம் மற்றும் விடுமுறைச் சேவை|बीच का स्टॉप और छुट्टी की सेवा
Holiday service (Suburban, MRTS & Metro)|விடுமுறைச் சேவை (புறநகர், MRTS, மெட்ரோ)|छुट्टी की सेवा (उपनगरीय, MRTS और मेट्रो)
Add an intermediate stop|இடைநிறுத்தத்தைச் சேர்|बीच का स्टॉप जोड़ें
Find connections|பயண வழிகளைத் தேடு|यात्रा के विकल्प खोजें
Comparing connections…|பயண வழிகளை ஒப்பிடுகிறது…|यात्रा विकल्पों की तुलना हो रही है…
Choose different, valid stops and at least one travel mode.|வேறு வேறு செல்லுபடியான நிறுத்தங்களையும் குறைந்தது ஒரு பயண வகையையும் தேர்ந்தெடுங்கள்.|अलग और मान्य स्टॉप चुनें, साथ में कम से कम एक यात्रा साधन चुनें।
Direct routes|நேரடி வழிகள்|सीधे मार्ग
Combined journeys|இணைப்புப் பயணங்கள்|मिली-जुली यात्राएँ
No transfers|மாற்றம் இல்லை|कोई बदलाव नहीं
One service with no transfers. Walking to or from stops may be included.|ஒரே வாகனத்தில் பயணம். நிறுத்தம் வரை நடக்க வேண்டியிருக்கலாம்.|एक ही सेवा, कोई बदलाव नहीं। स्टॉप तक पैदल जाना पड़ सकता है।
Next available connection|அடுத்த கிடைக்கும் பயணம்|अगला उपलब्ध सफ़र
Quickest local estimate|மதிப்பிடப்பட்ட விரைவான பயணம்|सबसे तेज़ अनुमानित यात्रा
Bus only|பேருந்து மட்டும்|केवल बस
Train only|ரயில் மட்டும்|केवल ट्रेन
Metro only|மெட்ரோ மட்டும்|केवल मेट्रो
Routes & stops|வழிகளும் நிறுத்தங்களும்|मार्ग और स्टॉप
Route and direction|வழித்தடம் மற்றும் திசை|मार्ग और दिशा
Metro service|மெட்ரோ சேவை|मेट्रो सेवा
Train|ரயில்|ट्रेन
Search|தேடல்|खोजें
Bus number or stop|பேருந்து எண் அல்லது நிறுத்தம்|बस नंबर या स्टॉप
Line or station|வழி அல்லது நிலையம்|लाइन या स्टेशन
Train number or station|ரயில் எண் அல்லது நிலையம்|ट्रेन नंबर या स्टेशन
Rail map|ரயில் வரைபடம்|रेल नक्शा
Show on map|வரைபடத்தில் காட்டு|नक्शे पर दिखाएँ
Station boards|நிலைய நேரப் பலகைகள்|स्टेशन समय-पट्ट
Service|சேவை|सेवा
Arrival (IST)|வருகை (IST)|आगमन (IST)
Departure (IST)|புறப்பாடு (IST)|प्रस्थान (IST)
Direction|திசை|दिशा
Scheduled|அட்டவணைப்படி|निर्धारित
Estimated|மதிப்பீடு|अनुमानित
No more trains scheduled here today.|இன்று இந்த நிலையத்தில் மேலும் ரயில்கள் இல்லை.|आज इस स्टेशन पर और ट्रेनें निर्धारित नहीं हैं।
Show only MEMU|MEMU மட்டும் காட்டு|केवल MEMU दिखाएँ
Show only fast and semi-fast locals|வேக மற்றும் அரைவேக ரயில்களை மட்டும் காட்டு|केवल तेज़ और अर्ध-तेज़ लोकल दिखाएँ
Fit route|முழு வழியைக் காட்டு|पूरा मार्ग दिखाएँ
Show all lines|அனைத்து வழிகளையும் காட்டு|सभी लाइनें दिखाएँ
Show all station names|அனைத்து நிலையப் பெயர்களையும் காட்டு|सभी स्टेशन नाम दिखाएँ
Hide extra station names|கூடுதல் நிலையப் பெயர்களை மறை|अतिरिक्त स्टेशन नाम छिपाएँ
Suburban / MRTS network map|புறநகர் / MRTS வலையமைப்பு வரைபடம்|उपनगरीय / MRTS नेटवर्क का नक्शा
Fit map|முழு வரைபடத்தைக் காட்டு|पूरा नक्शा दिखाएँ
Expand map|வரைபடத்தைப் பெரிதாக்கு|नक्शा बड़ा करें
Close expanded map|பெரிய வரைபடத்தை மூடு|बड़ा नक्शा बंद करें
Map credits|வரைபடத் தரவு மூலம்|नक्शे का स्रोत
Drag to move. Pinch, double-tap, or use + and − to zoom.|நகர்த்த இழுக்கவும். பெரிதாக்க இரு விரல்கள், இரட்டைத் தட்டு அல்லது +, − பயன்படுத்தவும்.|खिसकाने के लिए खींचें। ज़ूम के लिए पिंच, दो बार टैप या + और − इस्तेमाल करें।
Go to results|முடிவுகளுக்குச் செல்|नतीजों पर जाएँ
Back to journey results|பயண முடிவுகளுக்குத் திரும்பு|यात्रा नतीजों पर लौटें
Clear journey|பயணத்தை நீக்கு|यात्रा हटाएँ
Explore Chennai & beyond|சென்னையையும் சுற்றுப்புறத்தையும் சுற்றிப் பாருங்கள்|चेन्नई और आसपास घूमें
Follow the coast, visit a temple, or make a day of Chennai’s monuments.|கடற்கரையைச் சுற்றுங்கள், கோயிலுக்குச் செல்லுங்கள், சென்னையின் நினைவுச் சின்னங்களைக் காணுங்கள்.|समुद्र तट पर जाएँ, मंदिर देखें या चेन्नई के स्मारकों में एक दिन बिताएँ।
Beaches|கடற்கரைகள்|समुद्र तट
Temples|கோயில்கள்|मंदिर
Monuments|நினைவுச் சின்னங்கள்|स्मारक
Tourist places|சுற்றுலா இடங்கள்|पर्यटन स्थल
Search places|இடங்களைத் தேடு|स्थान खोजें
No places match these filters.|பொருந்தும் இடங்கள் இல்லை.|कोई स्थान नहीं मिला।
Plan trip|பயணத்தைத் திட்டமிடு|यात्रा की योजना बनाएँ
Plan to area|பகுதி வரை திட்டமிடு|इलाके तक यात्रा बनाएँ
Save trip|பயணத்தைச் சேமி|यात्रा सहेजें
Saved|சேமிக்கப்பட்டது|सहेजा गया
Share trip|பயணத்தைப் பகிர்|यात्रा साझा करें
Share this journey|இந்தப் பயணத்தைப் பகிர்|यह यात्रा साझा करें
Trip card|பயண அட்டை|यात्रा कार्ड
Copy trip|பயண விவரங்களை நகலெடு|यात्रा कॉपी करें
Follow this trip|இந்தப் பயணத்தைப் பின்பற்று|इस यात्रा के साथ चलें
Resume trip guide|பயண வழிகாட்டியைத் தொடர்|यात्रा गाइड फिर खोलें
Show this to the conductor|இதை நடத்துநரிடம் காட்டுங்கள்|कंडक्टर को दिखाएँ
I missed my connection|என் இணைப்புப் பயணத்தைத் தவறவிட்டேன்|मेरी कनेक्शन सेवा छूट गई
Previous|முந்தையது|पिछला
Next step|அடுத்த படி|अगला चरण
Finish trip|பயணத்தை முடி|यात्रा पूरी करें
Continue to your destination|சேருமிடத்திற்குத் தொடர்ந்து செல்லுங்கள்|गंतव्य की ओर आगे बढ़ें
Ask Vazhi|வழியிடம் கேளுங்கள்|Vazhi से पूछें
TransitLink passenger guide|TransitLink பயணி வழிகாட்டி|TransitLink यात्री गाइड
Ask a transit question|பயணம் பற்றிக் கேளுங்கள்|यात्रा का सवाल पूछें
Send|அனுப்பு|भेजें
You|நீங்கள்|आप
Open Stations|நிலையங்களைத் திற|स्टेशन खोलें
Open Explore|சுற்றுலா இடங்களைத் திற|पर्यटन स्थल खोलें
Which bus terminal?|எந்த பேருந்து நிலையம்?|कौन सा बस टर्मिनल?
How do I buy tickets?|பயணச்சீட்டு எப்படி வாங்குவது?|टिकट कैसे खरीदें?
`.trim().split('\n').map(line=>{
      const [key,ta,hi]=line.split('|');
      return [key,{ta,hi}];
    }),
  ]);
  const patterns=[
    [/^Direct Bus (.+)$/i,'நேரடி பேருந்து $1','सीधी बस $1'],
    [/^Direct (Train|MEMU) (.+)$/i,'நேரடி ரயில் $2','सीधी ट्रेन $2'],
    [/^Direct Metro (.+)$/i,'நேரடி மெட்ரோ $1','सीधी मेट्रो $1'],
    [/^View (\d+) stops$/,'$1 நிறுத்தங்களைக் காட்டு','$1 स्टॉप दिखाएँ'],
    [/^Step (\d+) of (\d+)$/,'படி $1 / $2','चरण $1 / $2'],
  ];
  const textRecords=new WeakMap(),attributeRecords=new WeakMap();
  const attributes=['placeholder','aria-label','title'];
  let locale='en';
  function getSaved(key) {try {return localStorage.getItem(key);} catch {return null;}}
  function save(key,value) {try {localStorage.setItem(key,value);} catch {}}
  function translate(source) {
    if (locale==='en') return source;
    const key=source.trim();
    const exact=dictionary.get(key)?.[locale];
    if (exact) return source.replace(key,exact);
    for (const [expression,ta,hi] of patterns) {
      if (expression.test(key)) return source.replace(key,key.replace(expression,locale==='ta'?ta:hi));
    }
    return source;
  }
  function patchText(node) {
    const record=textRecords.get(node),current=node.data;
    const source=record?.rendered===current?record.source:current;
    const rendered=translate(source);
    if (rendered!==source) textRecords.set(node,{source,rendered});
    else textRecords.delete(node);
    if (rendered!==current) node.data=rendered;
  }
  function patchAttributes(element) {
    const cache=attributeRecords.get(element)||new Map();
    for (const name of attributes) {
      const current=element.getAttribute(name);
      if (!current) continue;
      const record=cache.get(name),source=record?.rendered===current?record.source:current;
      const rendered=translate(source);
      if (rendered!==source) cache.set(name,{source,rendered});
      else cache.delete(name);
      if (rendered!==current) element.setAttribute(name,rendered);
    }
    if (cache.size) attributeRecords.set(element,cache);
  }
  const ignored='script,style,textarea,datalist,#interface-language,.guide-user';
  function patch(root) {
    if (root.nodeType===Node.TEXT_NODE) {
      if (!root.parentElement?.closest(ignored)) patchText(root);
      return;
    }
    if (root.nodeType!==Node.ELEMENT_NODE||root.closest(ignored)) return;
    patchAttributes(root);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{
      acceptNode:node=>node.nodeType===Node.ELEMENT_NODE&&node.matches(ignored)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT,
    });
    for (let node=walker.nextNode();node;node=walker.nextNode()) {
      if (node.nodeType===Node.TEXT_NODE) patchText(node);
      else patchAttributes(node);
    }
  }
  const observer=new MutationObserver(records=>{
    observer.disconnect();
    for (const record of records) {
      if (record.type==='attributes') patchAttributes(record.target);
      else if (record.type==='characterData') patch(record.target);
      else for (const node of record.addedNodes) patch(node);
    }
    observe();
  });
  function observe() {
    if (locale!=='en') observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
  }
  function setLanguage(value) {
    observer.disconnect();
    locale=['en','ta','hi'].includes(value)?value:'en';
    language.value=locale;
    document.documentElement.lang=locale;
    patch(document.body);
    observe();
    save('transitlink-language',locale);
  }
  function setTheme(value) {
    theme.value=value==='light'?'light':'dark';
    document.documentElement.dataset.theme=theme.value;
    save('transitlink-theme',theme.value);
  }
  language.onchange=()=>setLanguage(language.value);
  theme.onchange=()=>setTheme(theme.value);
  setTheme(getSaved('transitlink-theme'));
  setLanguage(getSaved('transitlink-language'));
})();
