import { useState } from "react";
import { Zap, User, Phone, Mail, MapPin, Clock, DollarSign, Shield, Upload, CheckCircle2, AlertCircle, ChevronRight, Star, Wifi, Battery, Bike, Info, ArrowRight, Loader2, Sun, Sunset, Sunrise, CalendarClock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { chargerListingsApi } from "../../api/client";
import PageMeta from "../../components/PageMeta/PageMeta";
import SiteFooter from "../../components/SiteFooter/SiteFooter";
import {
  isValidFullName,
  isValidCity,
  isValidAddress,
  isValidBrand,
  isValidDescription,
  isValidEmail,
  containsCarReference,
  VERIFIED_2W_MODELS,
  INDIAN_MOBILE_RE,
  PINCODE_RE,
  normalizePhoneInput,
  normalizePincodeInput,
  normalizeIdInput,
  ID_RULES,
  validateIdNumber,
  generateTimeOptions,
  formatTime12h,
  timeToPercent,
} from "../../utils/formValidation";
import "./RentCharger.css";

// Two-wheeler / scooter socket types only — no car-grade DC connectors
const CONNECTOR_TYPES = [
  "5A 3-Pin Socket (Standard)",
  "16A 3-Pin Socket (Fast)",
  "Ather Dot (Proprietary)",
  "Ola Portable Connector",
  "Bharat AC-001 (BS Type)",
  "Type 1 AC (J1772)",
];

// Power levels relevant for electric scooters & bikes only (max ~3.7 kW)
const POWER_LEVELS = [
  "0.9 kW (5A Slow)",
  "3.3 kW (16A Standard)",
  "3.7 kW (Fast AC)",
];

const ID_TYPES = ["Aadhaar Card","PAN Card","Driving Licence","Passport","Voter ID"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const STEP_LABELS = ["Personal Details","Charger Info","Availability","Verification"];
const TIME_OPTIONS = generateTimeOptions();
const MORNING = { from: "06:00", to: "10:00" };
const DAYTIME = { from: "09:00", to: "18:00" };
const EVENING = { from: "17:00", to: "21:00" };
const ALL_DAY = { from: "06:00", to: "23:00" };
const TIME_PRESETS = [
  { label: "Morning", sub: "6 AM – 10 AM", icon: Sunrise, ...MORNING },
  { label: "Daytime", sub: "9 AM – 6 PM", icon: Sun, ...DAYTIME },
  { label: "Evening", sub: "5 PM – 9 PM", icon: Sunset, ...EVENING },
  { label: "All Day", sub: "6 AM – 11 PM", icon: CalendarClock, ...ALL_DAY },
];
const MIN_BOOKING_OPTIONS = [
  { value: "0.5", label: "30 min" },
  { value: "1", label: "1 hr" },
  { value: "2", label: "2 hr" },
  { value: "3", label: "3 hr" },
  { value: "4", label: "4 hr" },
];
const NOTICE_OPTIONS = [
  { value: "0", label: "None" },
  { value: "0.5", label: "30 min" },
  { value: "1", label: "1 hr" },
  { value: "2", label: "2 hr" },
  { value: "6", label: "6 hr" },
  { value: "12", label: "12 hr" },
  { value: "24", label: "24 hr" },
];
const BENEFITS = [
  {icon:DollarSign,title:"Earn Passive Income",desc:"Monetise idle charging time and earn ₹800–₹3,000/month."},
  {icon:Shield,title:"Fully Insured",desc:"All sessions are covered by our platform insurance policy."},
  {icon:Star,title:"Verified Hosts",desc:"Hosts earn trust badges that attract more renters."},
  {icon:Wifi,title:"Smart Scheduling",desc:"Auto-block unavailable slots — zero manual effort."},
];

export default function RentCharger() {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [step,setStep]=useState(0);const[submitted,setSubmitted]=useState(false);const[error,setError]=useState("");const[submitting,setSubmitting]=useState(false);
  const[fullName,setFullName]=useState("");const[email,setEmail]=useState("");const[phone,setPhone]=useState("");
  const[address,setAddress]=useState("");const[city,setCity]=useState("");const[pincode,setPincode]=useState("");
  const[chargerBrand,setChargerBrand]=useState("");const[connectorType,setConnectorType]=useState("");
  const[powerLevel,setPowerLevel]=useState("");const[pricePerUnit,setPricePerUnit]=useState("");
  const[maxSessions,setMaxSessions]=useState("");const[chargerDescription,setChargerDescription]=useState("");
  const[vehicleSupport,setVehicleSupport]=useState([]); // which 2W models this charger supports
  const[selectedDays,setSelectedDays]=useState([]);const[timeFrom,setTimeFrom]=useState("06:00");
  const[timeTo,setTimeTo]=useState("22:00");const[minBookingHours,setMinBookingHours]=useState("1");
  const[advanceNoticeHours,setAdvanceNoticeHours]=useState("1");
  const[idType,setIdType]=useState("");const[idNumber,setIdNumber]=useState("");
  const[idFileName,setIdFileName]=useState("");const[selfieFileName,setSelfieFileName]=useState("");
  const[agreeTerms,setAgreeTerms]=useState(false);

  const toggleDay=(day)=>setSelectedDays(p=>p.includes(day)?p.filter(d=>d!==day):[...p,day]);
  const toggleVehicleSupport = (model) => {
    setVehicleSupport((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
    setError("");
  };
  const applyPreset=(from,to)=>{setTimeFrom(from);setTimeTo(to);setError("");};
  const minutesOf=(t)=>{const[h,m]=t.split(":").map(Number);return h*60+m;};

  const validateStep=()=>{
    setError("");
    if(step===0){
      if(!fullName.trim()){setError("Please enter your full name.");return false;}
      if(!isValidFullName(fullName)){setError("Please enter a valid full name — first and last name, letters only (no random characters).");return false;}
      if(!INDIAN_MOBILE_RE.test(phone)){setError("Please enter a valid 10-digit Indian mobile number (must start with 6, 7, 8 or 9).");return false;}
      if(!email.trim()){setError("Please enter your email address.");return false;}
      if(!isValidEmail(email)){setError("Please enter a valid email address (e.g. name@gmail.com, name@yahoo.com, name@ymail.com or your company domain).");return false;}
      if(!address.trim()){setError("Please enter your charger location address.");return false;}
      if(!isValidAddress(address)){setError("Please enter a valid address — use real words (street, area, landmark), not random characters.");return false;}
      if(!city.trim()){setError("Please enter your city.");return false;}
      if(!isValidCity(city)){setError("Please enter a valid city name — letters only, no random characters.");return false;}
      if(pincode && !PINCODE_RE.test(pincode)){setError("PIN code must be exactly 6 digits and cannot start with 0.");return false;}
    }
    if(step===1){
      if(!connectorType){setError("Please select a 2-wheeler connector or socket type.");return false;}
      if(!powerLevel){setError("Please select a power level.");return false;}
      if(!chargerBrand.trim()){
        setError("Please enter the charger brand, model, or socket name (e.g. Ather Dot, Ola Portable, Havells 16A).");
        return false;
      }
      if(containsCarReference(chargerBrand)){
        setError("❌ EV car chargers and 4-wheeler models (e.g. Nexon, ZS EV, Tesla, etc.) are strictly prohibited. VoltaicOS Rent My Charger only accepts EV bike & scooter chargers.");
        return false;
      }
      if(!isValidBrand(chargerBrand)){
        setError("Please enter a valid charger brand / model name — no random characters.");
        return false;
      }
      if(vehicleSupport.length === 0){
        setError("Please select at least one compatible EV bike or scooter model supported by your charger.");
        return false;
      }
      const price=Number(pricePerUnit);
      if(!pricePerUnit||isNaN(price)||price<=0){setError("Please enter a valid price per unit.");return false;}
      if(price>100){setError("Price per unit looks too high — please enter a realistic value (₹1–₹100).");return false;}
      if(maxSessions){const n=Number(maxSessions);if(isNaN(n)||n<1||n>20){setError("Max daily sessions must be between 1 and 20.");return false;}}
      if(chargerDescription.trim()){
        if(containsCarReference(chargerDescription)){
          setError("❌ Car chargers and 4-wheeler models are not allowed. Please remove any EV car references from your description.");
          return false;
        }
        if(!isValidDescription(chargerDescription)){
          setError("Please write a clearer description — at least 10 characters with real words, no random letters.");
          return false;
        }
      }
    }
    if(step===2){
      if(selectedDays.length===0){setError("Please select at least one available day.");return false;}
      if(!timeFrom||!timeTo){setError("Please choose both a start and an end time.");return false;}
      if(minutesOf(timeTo)<=minutesOf(timeFrom)){setError("End time must be after the start time — pick a later \u201cUntil\u201d time.");return false;}
    }
    if(step===3){
      if(!idType){setError("Please select your ID type.");return false;}
      if(!idNumber.trim()){setError("Please enter your ID number.");return false;}
      if(!validateIdNumber(idType,idNumber)){
        const rule=ID_RULES[idType];
        setError(`Please enter a valid ${idType} — ${rule?.label || "valid format"}.`);
        return false;
      }
      if(!agreeTerms){setError("Please accept the host terms to continue.");return false;}
    }
    return true;
  };
  const handleNext = async () => {
    if (!isAuthenticated) { openAuthModal(); return; }
    if (!validateStep()) return;
    if (step === STEP_LABELS.length - 1) {
      // Final step — submit to API
      setSubmitting(true);
      setError("");
      try {
        await chargerListingsApi.create({
          userId: user?.id || null,
          fullName: fullName.trim(), email: email.trim().toLowerCase(), phone, address: address.trim(), city: city.trim(), pincode,
          chargerBrand: chargerBrand.trim(), connectorType, powerLevel, pricePerUnit,
          maxSessions, chargerDescription: chargerDescription.trim(), selectedDays,
          supportedVehicles: vehicleSupport,
          timeFrom, timeTo, minBookingHours, advanceNoticeHours,
          idType, idNumber: idNumber.trim(),
        });
        setSubmitted(true);
      } catch (err) {
        setError(err.message || "Failed to submit application. Please try again.");
      } finally {
        setSubmitting(false);
      }
    } else {
      setStep((s) => s + 1);
    }
  };
  const handleBack=()=>{setError("");setStep(s=>s-1);};
  const resetAll=()=>{setSubmitted(false);setStep(0);setError("");setFullName("");setEmail("");setPhone("");setAddress("");setCity("");setPincode("");setChargerBrand("");setConnectorType("");setPowerLevel("");setPricePerUnit("");setMaxSessions("");setChargerDescription("");setVehicleSupport([]);setSelectedDays([]);setTimeFrom("06:00");setTimeTo("22:00");setMinBookingHours("1");setAdvanceNoticeHours("1");setIdType("");setIdNumber("");setIdFileName("");setSelfieFileName("");setAgreeTerms(false);};
  const idRule=ID_RULES[idType];
  const slotLeft=timeFrom?timeToPercent(timeFrom):0;
  const slotRight=timeTo?timeToPercent(timeTo):100;
  if(submitted){return(<div className="rc-page"><PageMeta title="Application Submitted — VoltaicOS" description="Your charger rental application has been submitted."/><div className="rc-success-wrap"><div className="rc-success-card card"><div className="rc-success-icon"><CheckCircle2 size={52} strokeWidth={1.5}/></div><h2 className="rc-success-title font-display">Application Submitted!</h2><p className="rc-success-sub">Thank you, <strong>{fullName}</strong>! Your 2-wheeler charger listing for <strong>{city}</strong> is under review. Our team will contact you at <strong>+91 {phone}</strong> within <strong>24–48 hours</strong>.</p><div className="rc-success-steps">{[{num:"01",text:"ID verification in progress"},{num:"02",text:"Location inspection scheduled"},{num:"03",text:"Listing goes live for EV 2W riders"}].map(s=><div key={s.num} className="rc-success-step"><span className="rc-step-num">{s.num}</span><span>{s.text}</span></div>)}</div><button className="btn btn-primary" onClick={resetAll}>Submit Another Charger</button></div></div><SiteFooter/></div>);}
  return(
    <div className="rc-page">
      <PageMeta title="Rent My 2-Wheeler Charger — VoltaicOS" description="List your home or private EV scooter & bike charger on VoltaicOS and earn passive income."/>
      <section className="rc-hero">
        <div className="rc-hero-glow"/>
        <div className="rc-hero-inner">
          <div className="rc-hero-badge"><Bike size={13}/><span>2-Wheeler Host Programme — Scooters &amp; Bikes Only</span></div>
          <h1 className="rc-hero-title font-display">Rent Your 2-Wheeler Charger,<br/><span className="rc-hero-accent">Earn Every kWh</span></h1>
          <p className="rc-hero-sub">Got a 16A/5A socket or dedicated EV bike/scooter charger sitting idle? List it on VoltaicOS and let nearby electric 2-wheeler riders book it — safely, insured, and on your schedule. (Note: Car chargers are strictly not accepted).</p>
          <div className="rc-benefits-row">
            {BENEFITS.map(({icon:Icon,title,desc})=><div key={title} className="rc-benefit-chip"><div className="rc-benefit-icon"><Icon size={16}/></div><div><div className="rc-benefit-title">{title}</div><div className="rc-benefit-desc">{desc}</div></div></div>)}
          </div>
        </div>
      </section>
      <section className="rc-form-section">
        <div className="rc-form-wrap">
          <div className="rc-stepper">
            {STEP_LABELS.map((label,idx)=>(
              <div key={label} className={`rc-stepper-item ${idx===step?"rc-stepper-item--active":""} ${idx<step?"rc-stepper-item--done":""}`}>
                <div className="rc-stepper-dot">{idx<step?<CheckCircle2 size={14}/>:<span>{idx+1}</span>}</div>
                <span className="rc-stepper-label">{label}</span>
                {idx<STEP_LABELS.length-1&&<ChevronRight size={14} className="rc-stepper-arrow"/>}
              </div>
            ))}
          </div>
          <div className="rc-form-card card">
            {step===0&&(
              <div className="rc-step-body">
                <div className="rc-step-header"><User size={22} className="rc-step-icon"/><div><h2 className="rc-step-title font-display">Personal Details</h2><p className="rc-step-sub">Tell us about yourself and where the charger is located.</p></div></div>
                <div className="rc-fields-grid rc-fields-grid--2">
                  <div className="rc-field"><label>Full Name <span className="rc-required">*</span></label><div className="rc-input-wrap"><User size={15}/><input type="text" placeholder="e.g. Arjun Mehta" maxLength={60} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)}/></div><p className="rc-field-hint">{fullName.length}/60 — first and last name</p></div>
                  <div className="rc-field"><label>Contact Number <span className="rc-required">*</span></label><div className="rc-input-wrap rc-input-phone"><span className="rc-phone-code">+91</span><Phone size={15}/><input type="tel" placeholder="98765 43210" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phone} onChange={e=>setPhone(normalizePhoneInput(e.target.value))}/></div><p className="rc-field-hint">+91 is added automatically — enter your 10-digit mobile (starts with 6–9)</p></div>
                  <div className="rc-field rc-field--full"><label>Email Address <span className="rc-required">*</span></label><div className="rc-input-wrap"><Mail size={15}/><input type="email" placeholder="name@gmail.com / name@yahoo.com / name@ymail.com" maxLength={80} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></div><p className="rc-field-hint">{email.length}/80 — Gmail, Yahoo, Ymail, Outlook, company domains and all valid providers are accepted</p></div>
                  <div className="rc-field rc-field--full"><label>Charger Location Address <span className="rc-required">*</span></label><div className="rc-input-wrap"><MapPin size={15}/><input type="text" placeholder="Flat / Building / Street / Area / Landmark" maxLength={120} autoComplete="street-address" value={address} onChange={e=>setAddress(e.target.value)}/></div><p className="rc-field-hint">{address.length}/120</p></div>
                  <div className="rc-field"><label>City <span className="rc-required">*</span></label><div className="rc-input-wrap"><MapPin size={15}/><input type="text" placeholder="e.g. Mumbai" maxLength={50} autoComplete="address-level2" value={city} onChange={e=>setCity(e.target.value)}/></div><p className="rc-field-hint">{city.length}/50</p></div>
                  <div className="rc-field"><label>PIN Code</label><div className="rc-input-wrap"><input type="text" placeholder="e.g. 400001" inputMode="numeric" maxLength={6} autoComplete="postal-code" value={pincode} onChange={e=>setPincode(normalizePincodeInput(e.target.value))}/></div><p className="rc-field-hint">{pincode.length}/6 — digits only</p></div>
                </div>
              </div>
            )}
            {step===1&&(
              <div className="rc-step-body">
                <div className="rc-tw-notice-banner">
                  <Bike size={18} />
                  <span><strong>2-Wheeler Community Exclusive:</strong> This hosting service is strictly for Electric 2-Wheelers (scooters &amp; motorcycles). Car chargers (CCS2, Type 2, DC Fast) are not permitted.</span>
                </div>
                <div className="rc-step-header"><Bike size={22} className="rc-step-icon"/><div><h2 className="rc-step-title font-display">2-Wheeler Charger Information</h2><p className="rc-step-sub">Describe the 2-wheeler charging socket or device you want to host.</p></div></div>
                <div className="rc-fields-grid rc-fields-grid--2">
                  <div className="rc-field"><label>2W Charger Brand / Socket Type <span className="rc-required">*</span></label><div className="rc-input-wrap"><Battery size={15}/><input type="text" placeholder="e.g. Ather Dot / Ola Portable / 16A EV Socket" maxLength={60} value={chargerBrand} onChange={e=>setChargerBrand(e.target.value)}/></div><p className="rc-field-hint">{chargerBrand.length}/60 — e.g. Ather Dot, Ola Portable, Legrand 16A. No car models.</p></div>
                  <div className="rc-field"><label>Power Level (2-Wheeler AC) <span className="rc-required">*</span></label><div className="rc-input-wrap rc-input-wrap--select"><Zap size={15}/><select value={powerLevel} onChange={e=>setPowerLevel(e.target.value)}><option value="">Select power level</option>{POWER_LEVELS.map(p=><option key={p} value={p}>{p}</option>)}</select></div></div>
                  <div className="rc-field rc-field--full"><label>Socket / Connector Type <span className="rc-required">*</span></label><div className="rc-connector-grid">{CONNECTOR_TYPES.map(ct=><button key={ct} type="button" className={`rc-connector-chip ${connectorType===ct?"rc-connector-chip--active":""}`} onClick={()=>setConnectorType(ct)}><Zap size={13}/>{ct}</button>)}</div></div>
                  
                  <div className="rc-field rc-field--full">
                    <div className="rc-label-row">
                      <label>Compatible EV Bike &amp; Scooter Models <span className="rc-required">*</span></label>
                      <button
                        type="button"
                        className="rc-select-all-models-btn"
                        onClick={() => setVehicleSupport(vehicleSupport.length === VERIFIED_2W_MODELS.length ? [] : [...VERIFIED_2W_MODELS])}
                      >
                        {vehicleSupport.length === VERIFIED_2W_MODELS.length ? "Clear All" : "Select All 2-Wheelers"}
                      </button>
                    </div>
                    <div className="rc-models-grid">
                      {VERIFIED_2W_MODELS.map((model) => (
                        <button
                          key={model}
                          type="button"
                          className={`rc-model-chip ${vehicleSupport.includes(model) ? "rc-model-chip--active" : ""}`}
                          onClick={() => toggleVehicleSupport(model)}
                        >
                          <Bike size={13} />
                          {model}
                        </button>
                      ))}
                    </div>
                    <p className="rc-field-hint">Select the EV scooters &amp; motorcycles verified to safely charge at this socket.</p>
                  </div>

                  <div className="rc-field"><label>Price per kWh (₹) <span className="rc-required">*</span></label><div className="rc-input-wrap"><span className="rc-currency">₹</span><input type="number" placeholder="e.g. 18" min="1" max="100" step="0.5" inputMode="decimal" value={pricePerUnit} onChange={e=>setPricePerUnit(e.target.value)}/></div><p className="rc-field-hint">Platform fee of 10% applies. You keep 90%.</p></div>
                  <div className="rc-field"><label>Max Daily 2W Sessions</label><div className="rc-input-wrap"><Bike size={15}/><input type="number" placeholder="e.g. 4" min="1" max="20" inputMode="numeric" value={maxSessions} onChange={e=>setMaxSessions(e.target.value)}/></div><p className="rc-field-hint">Between 1 and 20 bike/scooter sessions per day</p></div>
                  <div className="rc-field rc-field--full">
                    <div className="rc-label-row"><label htmlFor="rc-description">2-Wheeler Charger Description</label><span className="rc-char-count">{chargerDescription.length}/300</span></div>
                    <textarea id="rc-description" className="rc-textarea" placeholder="Instructions for EV scooter/bike riders — parking access, socket location, extension cord, gate codes..." rows={3} maxLength={300} value={chargerDescription} onChange={e=>setChargerDescription(e.target.value)}/>
                    <p className="rc-field-hint">Minimum 10 characters with real words. Car chargers and car models are strictly prohibited.</p>
                  </div>
                </div>
              </div>
            )}
            {step===2&&(
              <div className="rc-step-body">
                <div className="rc-step-header"><Clock size={22} className="rc-step-icon"/><div><h2 className="rc-step-title font-display">Availability Schedule</h2><p className="rc-step-sub">Pick the days and hours drivers can book your charger — everything is in plain 12-hour time.</p></div></div>
                <div className="rc-fields-grid rc-fields-grid--1">
                  <div className="rc-field"><label>Available Days <span className="rc-required">*</span></label><div className="rc-days-row">{DAYS.map(day=><button key={day} type="button" className={`rc-day-chip ${selectedDays.includes(day)?"rc-day-chip--active":""}`} onClick={()=>toggleDay(day)}>{day}</button>)}</div><button type="button" className="rc-select-all-days" onClick={()=>setSelectedDays(selectedDays.length===7?[]: [...DAYS])}>{selectedDays.length===7?"Clear all days":"Every day — select all"}</button></div>

                  <div className="rc-field">
                    <label>Quick Set — pick a time range</label>
                    <div className="rc-preset-row">
                      {TIME_PRESETS.map(({label,sub,icon:Icon,from,to})=>(
                        <button key={label} type="button" className={`rc-preset-chip ${timeFrom===from&&timeTo===to?"rc-preset-chip--active":""}`} onClick={()=>applyPreset(from,to)}>
                          <Icon size={15}/>
                          <span className="rc-preset-label">{label}</span>
                          <span className="rc-preset-sub">{sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rc-fields-grid rc-fields-grid--2">
                    <div className="rc-field"><label htmlFor="rc-time-from">Available From <span className="rc-required">*</span></label><div className="rc-input-wrap rc-input-wrap--select"><Clock size={15}/><select id="rc-time-from" value={timeFrom} onChange={e=>setTimeFrom(e.target.value)}>{TIME_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div></div>
                    <div className="rc-field"><label htmlFor="rc-time-to">Available Until <span className="rc-required">*</span></label><div className="rc-input-wrap rc-input-wrap--select"><Clock size={15}/><select id="rc-time-to" value={timeTo} onChange={e=>setTimeTo(e.target.value)}>{TIME_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div></div>
                  </div>

                  <div className="rc-timeline-block" aria-hidden="true">
                    <div className="rc-timeline-track">
                      <div className="rc-timeline-fill" style={{left:`${slotLeft}%`,width:`${Math.max(0,slotRight-slotLeft)}%`}}/>
                    </div>
                    <div className="rc-timeline-marks"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span></div>
                    <p className="rc-timeline-caption">Bookable: <strong>{formatTime12h(timeFrom)} – {formatTime12h(timeTo)}</strong></p>
                  </div>

                  <div className="rc-field"><label>Min Booking Duration</label><div className="rc-chip-row">{MIN_BOOKING_OPTIONS.map(o=><button key={o.value} type="button" className={`rc-choice-chip ${minBookingHours===o.value?"rc-choice-chip--active":""}`} onClick={()=>setMinBookingHours(o.value)}>{o.label}</button>)}</div></div>
                  <div className="rc-field"><label>Advance Notice Required</label><div className="rc-chip-row">{NOTICE_OPTIONS.map(o=><button key={o.value} type="button" className={`rc-choice-chip ${advanceNoticeHours===o.value?"rc-choice-chip--active":""}`} onClick={()=>setAdvanceNoticeHours(o.value)}>{o.label}</button>)}</div></div>
                  <div className="rc-availability-summary"><Info size={14}/><span>Your charger will be bookable on <strong>{selectedDays.length>0?selectedDays.join(", "):"—"}</strong>{selectedDays.length>0?` between ${formatTime12h(timeFrom)} and ${formatTime12h(timeTo)}.`:""}</span></div>
                </div>
              </div>
            )}
            {step===3&&(
              <div className="rc-step-body">
                <div className="rc-step-header"><Shield size={22} className="rc-step-icon"/><div><h2 className="rc-step-title font-display">Identity Verification</h2><p className="rc-step-sub">Required to activate your host listing. All data is encrypted and secure.</p></div></div>
                <div className="rc-fields-grid rc-fields-grid--2">
                  <div className="rc-field"><label>Government ID Type <span className="rc-required">*</span></label><div className="rc-input-wrap rc-input-wrap--select"><Shield size={15}/><select value={idType} onChange={e=>{setIdType(e.target.value);setIdNumber("");setError("");}}><option value="">Select ID type</option>{ID_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div>
                  <div className="rc-field"><label>ID Number <span className="rc-required">*</span></label><div className="rc-input-wrap"><Shield size={15}/><input type="text" placeholder={idRule?.placeholder || "Select an ID type first"} inputMode={idRule?.inputMode || "text"} autoComplete="off" maxLength={idRule?.maxLength || 16} disabled={!idType} value={idNumber} onChange={e=>setIdNumber(idType === 'Aadhaar Card' ? e.target.value.replace(/\D/g,'').slice(0, 12) : normalizeIdInput(e.target.value).slice(0, idRule?.maxLength || 16))}/></div><p className="rc-field-hint">{idRule?`Format: ${idRule.label} • ${idNumber.length}/${idRule.maxLength} characters`:"Select an ID type to see the expected format"}</p></div>
                  <div className="rc-field"><label>Upload ID Document</label><label className="rc-upload-zone"><Upload size={20}/><span className="rc-upload-text">{idFileName||"Click to upload front of ID"}</span><span className="rc-upload-hint">PNG, JPG or PDF — max 5 MB</span><input type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e=>setIdFileName(e.target.files?.[0]?.name||"")}/></label></div>
                  <div className="rc-field"><label>Live Photo <span className="rc-field-badge">KYC</span></label><label className="rc-upload-zone"><Upload size={20}/><span className="rc-upload-text">{selfieFileName||"Take or upload a live selfie holding your ID"}</span><span className="rc-upload-hint">Face clearly visible + ID in hand — max 5 MB · No pre-clicked photos</span><input type="file" accept="image/*" capture="user" style={{display:"none"}} onChange={e=>setSelfieFileName(e.target.files?.[0]?.name||"")}/></label></div>
                </div>
                <div className="rc-host-terms">
                  <div className="rc-terms-header"><Shield size={16}/><strong>Host Agreement Summary</strong></div>
                  <ul className="rc-terms-list">
                    <li>Your charger must be accessible and operational during listed hours.</li>
                    <li>You are responsible for maintaining the charger in safe working condition.</li>
                    <li>VoltaicOS collects a 10% platform fee on all completed sessions.</li>
                    <li>Hosts can pause or remove their listing at any time with 24 hours notice.</li>
                    <li>Fraudulent ID submissions result in permanent account suspension.</li>
                  </ul>
                  <label className="rc-agree-check">
                    <input type="checkbox" checked={agreeTerms} onChange={e=>setAgreeTerms(e.target.checked)}/>
                    <span>I agree to the VoltaicOS <a href="#terms" className="rc-terms-link">Host Terms &amp; Conditions</a> and confirm that all information is accurate and truthful.</span>
                  </label>
                </div>
              </div>
            )}
            {error&&<div className="rc-error-banner"><AlertCircle size={15}/><span>{error}</span></div>}
            <div className="rc-form-nav">
              {step>0&&<button type="button" className="btn btn-ghost" onClick={handleBack}>← Back</button>}
              <button type="button" className="btn btn-primary rc-next-btn" onClick={handleNext} disabled={submitting}>
                {step === STEP_LABELS.length - 1
                  ? submitting
                    ? <><Loader2 size={16} className="spin-icon" /><span>Submitting…</span></>
                    : <><span>Submit Application</span><CheckCircle2 size={16} /></>
                  : <><span>Next: {STEP_LABELS[step + 1]}</span><ArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter/>
    </div>
  );
}
