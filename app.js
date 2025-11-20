// app.js - core interactions: voice search, speech synthesis, vibration, ARIA updates
const stations = [
  {id:1, name_en:'Dahisar East', name_hi:'दहिसर पूर्व', name_mr:'दहिसर पूर्व', nextArrive:'2 min', platform:1, status:'On Time'},
  {id:2, name_en:'Kashigoan', name_hi:'काशीगांव', name_mr:'काशीगांव', nextArrive:'6 min', platform:2, status:'Minor Delay'},
  {id:3, name_en:'Miragoan', name_hi:'मिरगांव', name_mr:'मिरगांव', nextArrive:'10 min', platform:1, status:'Delayed'},
  {id:4, name_en:'Andheri', name_hi:'अंधेरी', name_mr:'अंधेरी', nextArrive:'12 min', platform:2, status:'On Time'}
];

const searchInput = document.getElementById('searchInput');
const stationsList = document.getElementById('stations-list');
const liveAnnouncements = document.getElementById('live-announcements');
const startVoice = document.getElementById('startVoice');
const stopVoice = document.getElementById('stopVoice');
const announceBtn = document.getElementById('announceBtn');
const vibrateBtn = document.getElementById('vibrateBtn');
const navigateBtn = document.getElementById('navigateBtn');
const contrastToggle = document.getElementById('contrastToggle');
const largeTextToggle = document.getElementById('largeTextToggle');

let selectedStationId = null;
let currentLang = 'en';

// render function with ARIA-friendly updates
function renderList(filter=''){
  stationsList.innerHTML = '';
  const filtered = stations.filter(s => s.name_en.toLowerCase().includes(filter.toLowerCase()) || s.name_hi.includes(filter) || s.name_mr.includes(filter));
  if(filtered.length === 0){
    const li = document.createElement('li');
    li.className = 'station-card';
    li.setAttribute('role','listitem');
    li.innerHTML = '<div class="station-meta"><div class="station-title">No stations found</div></div>';
    stationsList.appendChild(li);
    return;
  }
  filtered.forEach(s => {
    const li = document.createElement('li');
    li.className = 'station-card';
    li.setAttribute('role','listitem');
    li.tabIndex = 0;
    li.setAttribute('data-id', s.id);
    li.setAttribute('aria-label', s.name_en + ' station. Next arrival ' + s.nextArrive + '. Platform ' + s.platform);
    li.innerHTML = `
      <div class="station-meta">
        <div class="station-title" data-key="name">${getName(s)}</div>
        <div class="station-sub">Next: <span data-key="arr">${s.nextArrive}</span> • Platform: ${s.platform}</div>
      </div>
      <div class="station-actions">
        <button class="selectBtn" aria-label="Select ${getName(s)}">Select</button>
      </div>
    `;
    li.querySelector('.selectBtn').addEventListener('click', ()=> selectStation(s.id));
    li.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') selectStation(s.id); });
    stationsList.appendChild(li);
  });
}

// helper: name based on current language
function getName(station){
  if(currentLang === 'en') return station.name_en;
  if(currentLang === 'hi') return station.name_hi;
  return station.name_mr;
}

function selectStation(id){
  selectedStationId = id;
  const s = stations.find(x=>x.id===id);
  liveAnnouncements.innerText = `Selected ${getName(s)}. Next arrival ${s.nextArrive} on platform ${s.platform}.`;
  liveAnnouncements.setAttribute('aria-live','polite');
  speak(`${getName(s)} selected. Next arrival ${s.nextArrive} on platform ${s.platform}.`);
  // highlight selection for visual users
  document.querySelectorAll('.station-card').forEach(card => card.style.border = '');
  const el = document.querySelector('.station-card[data-id="'+id+'"]');
  if(el) el.style.border = '2px solid var(--accent)';
}

// initial render
renderList();

// live filtering
searchInput.addEventListener('input', (e)=> renderList(e.target.value));

// ------------------- Voice Search (SpeechRecognition) -------------------
let recognition;
if('webkitSpeechRecognition' in window || 'SpeechRecognition' in window){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.addEventListener('result', (e)=>{
    const text = e.results[0][0].transcript;
    searchInput.value = text;
    renderList(text);
    speak('Searching for ' + text);
  });

  recognition.addEventListener('end', ()=> {
    startVoice.disabled = false;
    stopVoice.disabled = true;
  });

  startVoice.addEventListener('click', ()=>{
    recognition.start();
    startVoice.disabled = true;
    stopVoice.disabled = false;
  });
  stopVoice.addEventListener('click', ()=>{
    recognition.stop();
    startVoice.disabled = false;
    stopVoice.disabled = true;
  });
} else {
  startVoice.addEventListener('click', ()=> speak('Sorry, voice recognition is not supported in this browser.'));
}

// ------------------- Speech Synthesis for announcements -------------------
function speak(text){
  if(!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  // choose voice based on language
  if(currentLang === 'hi') utter.lang = 'hi-IN';
  else if(currentLang === 'mr') utter.lang = 'mr-IN';
  else utter.lang = 'en-US';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
  // update ARIA live region
  liveAnnouncements.innerText = text;
}

// "Announce Next Train" demo
announceBtn.addEventListener('click', ()=>{
  const s = selectedStationId ? stations.find(x=>x.id===selectedStationId) : stations[0];
  const text = `${getName(s)}. Next train arriving in ${s.nextArrive} on platform ${s.platform}. Status ${s.status}.`;
  speak(text);
});

// ------------------- Vibration alert -------------------
vibrateBtn.addEventListener('click', ()=>{
  if('vibrate' in navigator){
    navigator.vibrate([200,100,200]);
    speak('Vibration alert triggered.');
  } else {
    speak('Vibration not supported on this device.');
  }
});

// ------------------- Navigate action (step-by-step audio) -------------------
navigateBtn.addEventListener('click', async ()=>{
  if(!selectedStationId){ speak('No station selected. Please select a station first.'); return; }
  const s = stations.find(x=>x.id===selectedStationId);
  speak(`Starting navigation to ${getName(s)}. Walk straight for 200 metres. Turn right at the pharmacy. Platform is on your left.`);
  // for screen readers update landmarks
  liveAnnouncements.setAttribute('aria-live','polite');
  liveAnnouncements.innerText = `Navigation to ${getName(s)} started.`;
});

// ------------------- Accessibility toggles -------------------
contrastToggle.addEventListener('click', ()=>{
  document.documentElement.classList.toggle('high-contrast');
  const pressed = document.documentElement.classList.contains('high-contrast');
  contrastToggle.setAttribute('aria-pressed', pressed);
  speak(pressed ? 'High contrast enabled' : 'High contrast disabled');
});

largeTextToggle.addEventListener('click', ()=>{
  document.documentElement.classList.toggle('large-text');
  const pressed = document.documentElement.classList.contains('large-text');
  largeTextToggle.setAttribute('aria-pressed', pressed);
  speak(pressed ? 'Large text enabled' : 'Large text disabled');
});

// ------------------- Language switching via accessible keyboard (optional) -------------------
window.addEventListener('keydown', (e)=>{
  // Alt+1 = English, Alt+2 = Hindi, Alt+3 = Marathi
  if(e.altKey && e.key === '1'){ currentLang = 'en'; renderList(searchInput.value); speak('Language set to English'); }
  if(e.altKey && e.key === '2'){ currentLang = 'hi'; renderList(searchInput.value); speak('भाषा हिन्दी चुनी गई'); }
  if(e.altKey && e.key === '3'){ currentLang = 'mr'; renderList(searchInput.value); speak('भाषा मराठी निवडली'); }
});

// ------------------- Ensure focus outlines for keyboard users -------------------
document.addEventListener('keydown', (e)=> {
  if(e.key === 'Tab') document.body.classList.add('show-focus');
});
