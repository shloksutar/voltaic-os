import { useState } from "react";
import { Zap, User, Phone, Mail, MapPin, Clock, DollarSign, Shield, Upload, CheckCircle2, AlertCircle, ChevronRight, Star, Wifi, Battery, Car, Info, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import PageMeta from "../../components/PageMeta/PageMeta";
import SiteFooter from "../../components/SiteFooter/SiteFooter";
import "./RentCharger.css";
const CONNECTOR_TYPES = ["CCS2","CHAdeMO","Type 2 (AC)","Bharat DC-001","Bharat AC-001","Type 1"];
const POWER_LEVELS = ["3.3 kW (Slow)","7.2 kW (Moderate)","11 kW (Fast)","22 kW (Fast)","50 kW (DC Rapid)","100 kW+ (Ultra-Rapid)"];
const ID_TYPES = ["Aadhaar Card","PAN Card","Driving Licence","Passport","Voter ID"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const STEP_LABELS = ["Personal Details","Charger Info","Availability","Verification"];
const BENEFITS = [
  {icon:DollarSign,title:"Earn Passive Income",desc:"Monetise idle charging time and earn ₹800–₹3,000/month."},
  {icon:Shield,title:"Fully Insured",desc:"All sessions are covered by our platform insurance policy."},
  {icon:Star,title:"Verified Hosts",desc:"Hosts earn trust badges that attract more renters."},
  {icon:Wifi,title:"Smart Scheduling",desc:"Auto-block unavailable slots — zero manual effort."},
];
export default function RentCharger() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [step,setStep]=useState(0);const[submitted,setSubmitted]=useState(false);const[error,setError]=useState("");
  const[fullName,setFullName]=useState("");const[email,setEmail]=useState("");const[phone,setPhone]=useState("");
  const[address,setAddress]=useState("");const[city,setCity]=useState("");const[pincode,setPincode]=useState("");
  const[chargerBrand,setChargerBrand]=useState("");const[connectorType,setConnectorType]=useState("");
  const[powerLevel,setPowerLevel]=useState("");const[pricePerUnit,setPricePerUnit]=useState("");
  const[maxSessions,setMaxSessions]=useState("");const[chargerDescription,setChargerDescription]=useState("");
  const[selectedDays,setSelectedDays]=useState([]);const[timeFrom,setTimeFrom]=useState("");
  const[timeTo,setTimeTo]=useState("");const[minBookingHours,setMinBookingHours]=useState("");
  const[advanceNoticeHours,setAdvanceNoticeHours]=useState("");
  const[idType,setIdType]=useState("");const[idNumber,setIdNumber]=useState("");
  const[idFileName,setIdFileName]=useState("");const[selfieFileName,setSelfieFileName]=useState("");
  const[agreeTerms,setAgreeTerms]=useState(false);
  const toggleDay=(day)=>setSelectedDays(p=>p.includes(day)?p.filter(d=>d!==day):[...p,day]);
  const validateStep=()=>{
    setError("");
    if(step===0){if(!fullName.trim()){setError("Please enter your full name.");return false;}if(!phone.trim()||phone.length<8){setError("Please enter a valid phone number.");return false;}if(!email.trim()||!email.includes("@")){setError("Please enter a valid email address.");return false;}if(!address.trim()){setError("Please enter your charger location address.");return false;}if(!city.trim()){setError("Please enter your city.");return false;}}
    if(step===1){if(!connectorType){setError("Please select a connector type.");return false;}if(!powerLevel){setError("Please select a power level.");return false;}if(!pricePerUnit||isNaN(Number(pricePerUnit))){setError("Please enter a valid price per unit.");return false;}}
    if(step===2){if(selectedDays.length===0){setError("Please select at least one available day.");return false;}}
    if(step===3){if(!idType){setError("Please select your ID type.");return false;}if(!idNumber.trim()){setError("Please enter your ID number.");return false;}if(!agreeTerms){setError("Please accept the host terms to continue.");return false;}}
    return true;
  };
  const handleNext=()=>{if(!isAuthenticated){openAuthModal();return;}if(validateStep()){if(step===STEP_LABELS.length-1)setSubmitted(true);else setStep(s=>s+1);}};
  const handleBack=()=>{setError("");setStep(s=>s-1);};
  const resetAll=()=>{setSubmitted(false);setStep(0);setError("");setFullName("");setEmail("");setPhone("");setAddress("");setCity("");setPincode("");setChargerBrand("");setConnectorType("");setPowerLevel("");setPricePerUnit("");setMaxSessions("");setChargerDescription("");setSelectedDays([]);setTimeFrom("");setTimeTo("");setMinBookingHours("");setAdvanceNoticeHours("");setIdType("");setIdNumber("");setIdFileName("");setSelfieFileName("");setAgreeTerms(false);};
  if(submitted){return(<div className="rc-page"><PageMeta title="Application Submitted — VoltaicOS" description="Your charger rental application has been submitted."/><div className="rc-success-wrap"><div className="rc-success-card card"><div className="rc-success-icon"><CheckCircle2 size={52} strokeWidth={1.5}/></div><h2 className="rc-success-title font-display">Application Submitted!</h2><p className="rc-success-sub">Thank you, <strong>{fullName}</strong>! Your charger listing for <strong>{city}</strong> is under review. Our team will contact you at <strong>+91 {phone}</strong> within <strong>24–48 hours</strong>.</p><div className="rc-success-steps">{[{num:"01",text:"ID verification in progress"},{num:"02",text:"Location inspection scheduled"},{num:"03",text:"Listing goes live on VoltaicOS"}].map(s=><div key={s.num} className="rc-success-step"><span className="rc-step-num">{s.num}</span><span>{s.text}</span></div>)}</div><button className="btn btn-primary" onClick={resetAll}>Submit Another Charger</button></div></div><SiteFooter/></div>);}
  return(
    <div className="rc-page">
      <PageMeta title="Rent My Charger — VoltaicOS" description="List your home or private EV charger on VoltaicOS and earn passive income."/>
      <section className="rc-hero">
        <div className="rc-hero-glow"/>
        <div className="rc-hero-inner">
          <div className="rc-hero-badge"><Zap size={13}/><span>Host Programme — Open Now</span></div>
          <h1 className="rc-hero-title font-display">Rent Your Charger,<br/><span className="rc-hero-accent">Earn Every kWh</span></h1>
          <p className="rc-hero-sub">Got a home charger sitting idle? List it on VoltaicOS and let nearby EV drivers book it — safely, insured, and completely on your schedule.</p>
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
                  <div className="rc-field"><label>Full Name <span className="rc-required">*</span></label><div className="rc-input-wrap"><User size={15}/><input type="text" placeholder="e.g. Arjun Mehta" value={fullName} onChange={e=>setFullName(e.target.value)}/></div></div>
                  <div className="rc-field"><label>Contact Number <span className="rc-required">*</span></label><div className="rc-input-wrap rc-input-phone"><span className="rc-phone-code">+91</span><Phone size={15}/><input type="tel" placeholder="10-digit mobile number" value={phone} onChange={e=>setPhone(e.target.value)}/></div></div>
                  <div className="rc-field rc-field--full"><label>Email Address <span className="rc-required">*</span></label><div className="rc-input-wrap"><Mail size={15}/><input type="email" placeholder="name@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></div></div>
                  <div className="rc-field rc-field--full"><label>Charger Location Address <span className="rc-required">*</span></label><div className="rc-input-wrap"><MapPin size={15}/><input type="text" placeholder="Flat / Building / Street / Area" value={address} onChange={e=>setAddress(e.target.value)}/></div></div>
                  <div className="rc-field"><label>City <span className="rc-required">*</span></label><div className="rc-input-wrap"><MapPin size={15}/><input type="text" placeholder="e.g. Mumbai" value={city} onChange={e=>setCity(e.target.value)}/></div></div>
                  <div className="rc-field"><label>PIN Code</label><div className="rc-input-wrap"><input type="text" placeholder="e.g. 400001" maxLength={6} value={pincode} onChange={e=>setPincode(e.target.value)}/></div></div>
                </div>
              </div>
            )}
            {step===1&&(
              <div className="rc-step-body">
                <div className="rc-step-header"><Zap size={22} className="rc-step-icon"/><div><h2 className="rc-step-title font-display">Charger Information</h2><p className="rc-step-sub">Describe the charger you want to list — specs and pricing.</p></div></div>
                <div className="rc-fields-grid rc-fields-grid--2">
                  <div className="rc-field"><label>Charger Brand / Model</label><div className="rc-input-wrap"><Battery size={15}/><input type="text" placeholder="e.g. Tata Power EV Charger" value={chargerBrand} onChange={e=>setChargerBrand(e.target.value)}/></div></div>
                  <div className="rc-field"><label>Power Level <span className="rc-required">*</span></label><div className="rc-input-wrap rc-input-wrap--select"><Zap size={15}/><select value={powerLevel} onChange={e=>setPowerLevel(e.target.value)}><option value="">Select power level</option>{POWER_LEVELS.map(p=><option key={p} value={p}>{p}</option>)}</select></div></div>
                  <div className="rc-field rc-field--full"><label>Connector Type <span className="rc-required">*</span></label><div className="rc-connector-grid">{CONNECTOR_TYPES.map(ct=><button key={ct} type="button" className={`rc-connector-chip ${connectorType===ct?"rc-connector-chip--active":""}`} onClick={()=>setConnectorType(ct)}><Zap size={13}/>{ct}</button>)}</div></div>
                  <div className="rc-field"><label>Price per kWh (₹) <span className="rc-required">*</span></label><div className="rc-input-wrap"><span className="rc-currency">₹</span><input type="number" placeholder="e.g. 18" min="1" value={pricePerUnit} onChange={e=>setPricePerUnit(e.target.value)}/></div><p className="rc-field-hint">Platform fee of 10% applies. You keep 90%.</p></div>
                  <div className="rc-field"><label>Max Daily Sessions</label><div className="rc-input-wrap"><Car size={15}/><input type="number" placeholder="e.g. 4" min="1" max="20" value={maxSessions} onChange={e=>setMaxSessions(e.target.value)}/></div></div>
                  <div className="rc-field rc-field--full"><label>Charger Description</label><textarea className="rc-textarea" placeholder="Any details renters should know — parking access, gate codes, instructions..." rows={3} value={chargerDescription} onChange={e=>setChargerDescription(e.target.value)}/></div>
                </div>
              </div>
            )}
            {step===2&&(
              <div className="rc-step-body">
                <div className="rc-step-header"><Clock size={22} className="rc-step-icon"/><div><h2 className="rc-step-title font-display">Availability Schedule</h2><p className="rc-step-sub">Set when drivers can book your charger.</p></div></div>
                <div className="rc-fields-grid rc-fields-grid--1">
                  <div className="rc-field"><label>Available Days <span className="rc-required">*</span></label><div className="rc-days-row">{DAYS.map(day=><button key={day} type="button" className={`rc-day-chip ${selectedDays.includes(day)?"rc-day-chip--active":""}`} onClick={()=>toggleDay(day)}>{day}</button>)}</div><button type="button" className="rc-select-all-days" onClick={()=>setSelectedDays(selectedDays.length===7?[]: [...DAYS])}>{selectedDays.length===7?"Deselect All":"Select All Days"}</button></div>
                  <div className="rc-fields-grid rc-fields-grid--2">
                    <div className="rc-field"><label>Available From <span className="rc-required">*</span></label><div className="rc-input-wrap"><Clock size={15}/><input type="time" value={timeFrom} onChange={e=>setTimeFrom(e.target.value)}/></div></div>
                    <div className="rc-field"><label>Available Until <span className="rc-required">*</span></label><div className="rc-input-wrap"><Clock size={15}/><input type="time" value={timeTo} onChange={e=>setTimeTo(e.target.value)}/></div></div>
                  </div>
                  <div className="rc-fields-grid rc-fields-grid--2">
                    <div className="rc-field"><label>Min Booking Duration (hrs)</label><div className="rc-input-wrap"><input type="number" min="1" max="12" value={minBookingHours} onChange={e=>setMinBookingHours(e.target.value)}/></div></div>
                    <div className="rc-field"><label>Advance Notice Required (hrs)</label><div className="rc-input-wrap"><input type="number" min="0" max="48" value={advanceNoticeHours} onChange={e=>setAdvanceNoticeHours(e.target.value)}/></div></div>
                  </div>
                  <div className="rc-availability-summary"><Info size={14}/><span>Your charger will be bookable on <strong>{selectedDays.length>0?selectedDays.join(", "):"—"}</strong>{selectedDays.length>0?` between ${timeFrom} and ${timeTo}.`:""}</span></div>
                </div>
              </div>
            )}
            {step===3&&(
              <div className="rc-step-body">
                <div className="rc-step-header"><Shield size={22} className="rc-step-icon"/><div><h2 className="rc-step-title font-display">Identity Verification</h2><p className="rc-step-sub">Required to activate your host listing. All data is encrypted and secure.</p></div></div>
                <div className="rc-fields-grid rc-fields-grid--2">
                  <div className="rc-field"><label>Government ID Type <span className="rc-required">*</span></label><div className="rc-input-wrap rc-input-wrap--select"><Shield size={15}/><select value={idType} onChange={e=>setIdType(e.target.value)}><option value="">Select ID type</option>{ID_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div>
                  <div className="rc-field"><label>ID Number <span className="rc-required">*</span></label><div className="rc-input-wrap"><Shield size={15}/><input type="text" placeholder="Enter your ID number" value={idNumber} onChange={e=>setIdNumber(e.target.value)}/></div></div>
                  <div className="rc-field"><label>Upload ID Document</label><label className="rc-upload-zone"><Upload size={20}/><span className="rc-upload-text">{idFileName||"Click to upload front of ID"}</span><span className="rc-upload-hint">PNG, JPG or PDF — max 5 MB</span><input type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e=>setIdFileName(e.target.files?.[0]?.name||"")}/></label></div>
                  <div className="rc-field"><label>Selfie with ID</label><label className="rc-upload-zone"><Upload size={20}/><span className="rc-upload-text">{selfieFileName||"Click to upload selfie holding ID"}</span><span className="rc-upload-hint">Clear face + ID visible — max 5 MB</span><input type="file" accept="image/*" style={{display:"none"}} onChange={e=>setSelfieFileName(e.target.files?.[0]?.name||"")}/></label></div>
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
              <button type="button" className="btn btn-primary rc-next-btn" onClick={handleNext}>
                {step===STEP_LABELS.length-1?<><span>Submit Application</span><CheckCircle2 size={16}/></>:<><span>Next: {STEP_LABELS[step+1]}</span><ArrowRight size={16}/></>}
              </button>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter/>
    </div>
  );
}
