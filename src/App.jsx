import { useState, useEffect, useRef } from "react";
import QRCodeLib from "qrcode";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   Supabase 정보
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var SUPABASE_URL = "https://wfbiovaieuoyrakbvcpq.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmlvdmFpZXVveXJha2J2Y3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMTc5MTQsImV4cCI6MjA5MjY5MzkxNH0.7aFz4W-Xs13lu2QF7MNSkCYdSWLDjlX38CGPCZxEXEE";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   EmailJS 정보
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var EMAILJS_SERVICE_ID  = "service_goalstorm91";
var EMAILJS_TEMPLATE_ID = "template_goalstorm91";
var EMAILJS_PUBLIC_KEY  = "ES-wwn3_EQ8KgbTJa";

// EmailJS 이메일 발송 함수
function sendEmail(toEmail, teacherName, facilityName, date, timeSlot, purpose, status) {
  if(!toEmail) {
    console.warn("이메일 주소 없음 - 발송 생략");
    return Promise.resolve();
  }
  var templateParams = {
    to_email:      toEmail,
    teacher_name:  teacherName,
    facility_name: facilityName,
    date:          date,
    time_slot:     timeSlot,
    purpose:       purpose,
    status:        status,
    is_approved:   status === "승인" ? "true" : "",
  };
  return fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id:  EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id:     EMAILJS_PUBLIC_KEY,
      template_params: templateParams,
    }),
  })
  .then(function(res){
    if(!res.ok) return res.text().then(function(t){ throw new Error(t); });
    console.log("이메일 발송 성공:", toEmail);
    return res.text();
  })
  .catch(function(e){ console.error("이메일 발송 오류:", e); });
}

// ── Supabase API 헬퍼 ────────────────────
function sbFetch(path, options) {
  options = options || {};
  var headers = Object.assign({
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    "Prefer": options.prefer || "return=representation",
  }, options.headers || {});
  return fetch(SUPABASE_URL + "/rest/v1/" + path, {
    method: options.method || "GET",
    headers: headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).then(function(res) {
    if (!res.ok) return res.text().then(function(t){ throw new Error(t); });
    return res.json().catch(function(){ return []; });
  });
}
var sb = {
  get:    function(table, query) { return sbFetch(table + "?" + (query||"select=*")); },
  post:   function(table, data)  { return sbFetch(table, { method:"POST", body:data }); },
  patch:  function(table, query, data) { return sbFetch(table+"?"+query, { method:"PATCH", body:data }); },
  delete: function(table, query) { return sbFetch(table+"?"+query, { method:"DELETE", prefer:"" }); },
};

// ── 상수 ────────────────────────────────
var DAY_KR     = ["일","월","화","수","목","금","토"];
var TIME_SLOTS = [
  "1교시(09:00~09:40)",
  "2교시(09:50~10:30)",
  "3교시(11:00~11:40)",
  "4교시(11:50~12:30)",
  "5교시(13:10~13:50)",
  "6교시(14:00~14:40)",
];
var today      = new Date();
var COLORS_LIST= ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4","#f97316","#6366f1","#14b8a6"];
var ICONS_FAC  = ["(과학)","(컴)","(도서)","(음악)","(체육)","(미술)","(운동)","(강당)","(과학2)","(수학)"];
var ICONS_ITEM = ["(태블릿)","(빔)","(VR)","(로봇)","(드론)","(게임)","(카메라)","(배터리)","(기타)","(펜)"];
var NOTICES    = [
  { id:1, type:"urgent", icon:"[긴급]", title:"긴급", text:"오늘 오후 과학실 누수로 3~6교시 사용 불가합니다.", date:"오늘" },
  { id:2, type:"info",   icon:"[공지]", title:"공지", text:"5/15(목) 전 시설 예약이 제한됩니다.", date:"5/12" },
  { id:3, type:"new",    icon:"[안내]", title:"안내", text:"태블릿 세트 10대 신규 입고되었습니다.", date:"5/10" },
];
var BADGE_CLR  = { urgent:"#ef4444", info:"#60a5fa", new:"#34d399" };
var savedSession = null;

function fmtDate(base, offset) {
  var d = new Date(base);
  d.setDate(d.getDate() + offset);
  return (d.getMonth()+1)+"/"+d.getDate()+"("+DAY_KR[d.getDay()]+")";
}

// ── 전역 CSS ────────────────────────────
var CSS = [
  "@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}",
  "@keyframes fadeIn{from{opacity:0}to{opacity:1}}",
  "@keyframes popIn{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}",
  "@keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}",
  "@keyframes spin{to{transform:rotate(360deg)}}",
  "@keyframes marquee{0%{transform:translateX(105%)}100%{transform:translateX(-105%)}}",
  "@keyframes toastAnim{0%{opacity:0;transform:translateX(-50%) translateY(-14px)}100%{opacity:1;transform:translateX(-50%) translateY(0)}}",
  "@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}",
  "input:focus,textarea:focus{outline:none;border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,.18)!important}",
  "::-webkit-scrollbar{display:none}",
].join("");

// ── 로딩 스피너 ──────────────────────────
function Spinner(props) {
  var size = props.size || 32;
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:props.full?"60px 0":"0"}}>
      <div style={{width:size,height:size,border:"3px solid #e8ecf0",borderTop:"3px solid #6366f1",borderRadius:"50%",animation:"spin .7s linear infinite"}}></div>
      {props.label && <span style={{marginLeft:10,color:"#94a3b8",fontSize:13,fontWeight:600}}>{props.label}</span>}
    </div>
  );
}

// ── QR 코드 (진짜 스캔 가능) ─────────────
function QRCode(props) {
  var text = props.text;
  var size = props.size || 180;
  var canvasRef = useRef(null);
  var [dataUrl, setDataUrl] = useState("");

  useEffect(function(){
    QRCodeLib.toDataURL(text, {
      width: size,
      margin: 2,
      color: { dark:"#1e1b4b", light:"#ffffff" },
      errorCorrectionLevel: "H",
    }, function(err, url){
      if(!err) setDataUrl(url);
    });
  }, [text, size]);

  if(!dataUrl) return (
    <div style={{width:size,height:size,background:"#f1f5f9",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <Spinner size={24}/>
    </div>
  );
  return (
    <div style={{background:"white",borderRadius:16,padding:10,display:"inline-block",boxShadow:"0 4px 20px rgba(0,0,0,.12)"}}>
      <img src={dataUrl} width={size} height={size} style={{display:"block",borderRadius:8}} alt="QR Code"/>
    </div>
  );
}

// ── 공지 배너 ────────────────────────────
function NoticeBanner(props) {
  var noticeList = (props.notices && props.notices.length > 0) ? props.notices : NOTICES;
  var [open,setOpen]=useState(false), [sel,setSel]=useState(null);
  var urgent=noticeList.filter(function(n){ return n.type==="urgent"; }).length;
  if(noticeList.length===0) return null;
  return (
    <div style={{width:"100%",maxWidth:380,marginBottom:14}}>
      <div onClick={function(){ setOpen(function(v){ return !v; }); }}
        style={{background:"rgba(255,255,255,.11)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,.22)",borderRadius:open?"16px 16px 0 0":"16px",padding:"11px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",userSelect:"none"}}>
        <div style={{position:"relative",flexShrink:0}}>
          <div style={{width:32,height:32,borderRadius:10,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>[목록]</div>
          {urgent>0&&<span style={{position:"absolute",top:-5,right:-5,background:"#ef4444",color:"white",fontSize:9,fontWeight:900,borderRadius:99,padding:"2px 5px",animation:"pulse 2s infinite"}}>{urgent}</span>}
        </div>
        <div style={{flex:1,overflow:"hidden",whiteSpace:"nowrap"}}>
          <span style={{display:"inline-block",animation:"marquee 16s linear infinite",color:"rgba(255,255,255,.88)",fontSize:12,fontWeight:600}}>
            {noticeList[0].icon} [{noticeList[0].title}] {noticeList[0].text}
          </span>
        </div>
        <span style={{color:"rgba(255,255,255,.5)",fontSize:11,transition:"transform .25s",transform:open?"rotate(180deg)":"none",display:"inline-block"}}>▼</span>
      </div>
      {open&&(
        <div style={{background:"rgba(10,20,50,.92)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,.1)",borderTop:"none",borderRadius:"0 0 16px 16px",overflow:"hidden"}}>
          {noticeList.map(function(n,i){
            return (
              <div key={n.id} onClick={function(){ setSel(n); }}
                style={{padding:"12px 16px",borderTop:i?"1px solid rgba(255,255,255,.07)":"none",display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",background:n.type==="urgent"?"rgba(239,68,68,.07)":"transparent"}}>
                <span style={{fontSize:17,flexShrink:0}}>{n.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span style={{background:BADGE_CLR[n.type]||"#60a5fa",color:"white",fontSize:9,fontWeight:900,padding:"2px 7px",borderRadius:99}}>{n.title}</span>
                    <span style={{color:"rgba(255,255,255,.3)",fontSize:10}}>{n.date}</span>
                  </div>
                  <p style={{color:"rgba(255,255,255,.7)",fontSize:12,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {sel&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={function(){ setSel(null); }}>
          <div style={{background:"linear-gradient(160deg,#1e1b4b,#1e3a5f)",borderRadius:24,padding:"32px 26px",width:"100%",maxWidth:340,animation:"popIn .28s ease"}} onClick={function(e){ e.stopPropagation(); }}>
            <div style={{fontSize:28,marginBottom:12}}>{sel.icon}</div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{background:BADGE_CLR[sel.type]||"#60a5fa",color:"white",fontSize:11,fontWeight:900,padding:"3px 10px",borderRadius:99}}>{sel.title}</span>
              <span style={{color:"rgba(255,255,255,.35)",fontSize:12}}>{sel.date}</span>
            </div>
            <p style={{color:"rgba(255,255,255,.9)",fontSize:14,lineHeight:1.85,margin:"0 0 24px"}}>{sel.text}</p>
            <button onClick={function(){ setSel(null); }} style={{width:"100%",background:"rgba(255,255,255,.1)",border:"none",borderRadius:14,padding:13,color:"white",fontWeight:700,fontSize:14,cursor:"pointer"}}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 로그인 / 회원가입 ────────────────────
function LoginScreen(props) {
  var onLogin=props.onLogin, onRegister=props.onRegister;
  var [mode,setMode]=useState("login");
  var [id,setId]=useState(""), [pw,setPw]=useState("");
  var [showPw,setShowPw]=useState(false);
  var [err,setErr]=useState(""), [loading,setLoading]=useState(false);
  var [autoLogin,setAutoLogin]=useState(false);
  var [form,setForm]=useState({name:"",id:"",pw:"",pwCheck:"",subject:"",email:"",role:"teacher"});
  var [showSpw,setShowSpw]=useState(false);
  var [signErr,setSignErr]=useState(""), [done,setDone]=useState(false);

  function switchMode(m){ setMode(m);setErr("");setSignErr("");setDone(false);setId("");setPw(""); }

  function login(){
    setErr(""); setLoading(true);
    sb.get("users","select=*&login_id=eq."+id+"&password=eq."+pw)
      .then(function(rows){
        if(rows&&rows.length>0){
          var u=rows[0];
          if(autoLogin) savedSession=u;
          onLogin(u);
        } else {
          setErr("아이디 또는 비밀번호가 올바르지 않아요.");
          setLoading(false);
        }
      })
      .catch(function(e){
        setErr("연결 오류: Supabase URL/KEY를 확인해주세요.");
        setLoading(false);
        console.error(e);
      });
  }

  function signup(){
    setSignErr("");
    if(!form.name||!form.name.trim()) return setSignErr("이름을 입력해주세요.");
    if(!form.id||form.id.length<4)    return setSignErr("아이디는 4자 이상이어야 해요.");
    if(form.pw.length<4)              return setSignErr("비밀번호는 4자 이상이어야 해요.");
    if(form.pw!==form.pwCheck)        return setSignErr("비밀번호가 일치하지 않아요.");
    if(!form.subject||!form.subject.trim()) return setSignErr("담당 과목을 입력해주세요.");
    setLoading(true);
    sb.post("users",{
      login_id:form.id, password:form.pw, name:form.name.trim(),
      role:form.role, subject:form.subject.trim(),
      email: form.email ? form.email.trim() : null,
      avatar:form.role==="admin"?"":""
    }).then(function(){
      setDone(true); setLoading(false);
      setTimeout(function(){ switchMode("login"); },2200);
    }).catch(function(e){
      setSignErr("가입 오류: "+e.message);
      setLoading(false);
    });
  }
  function setF(k){ return function(e){ setForm(function(v){ var n=Object.assign({},v); n[k]=e.target.value; return n; }); setSignErr(""); }; }

  var inputStyle={width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,.08)",border:"1.5px solid rgba(255,255,255,.14)",borderRadius:13,padding:"14px 16px",color:"white",fontSize:14,fontFamily:"sans-serif"};

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#0f0c29,#302b63,#24243e)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px 40px",fontFamily:"sans-serif",position:"relative",overflowY:"auto"}}>
      <style>{CSS}</style>
      <div style={{position:"fixed",top:"10%",left:"15%",width:260,height:260,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,.18),transparent 70%)",pointerEvents:"none"}}></div>
      <div style={{position:"fixed",bottom:"15%",right:"10%",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,.15),transparent 70%)",pointerEvents:"none"}}></div>

      <div style={{textAlign:"center",marginBottom:22,animation:"fadeUp .5s ease"}}>
        <div style={{width:70,height:70,borderRadius:22,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 14px",boxShadow:"0 8px 32px rgba(99,102,241,.4)"}}>[학교]</div>
        <h1 style={{color:"white",fontSize:22,fontWeight:900,margin:"0 0 5px"}}>스마트 예약 시스템</h1>
        <p style={{color:"rgba(255,255,255,.42)",fontSize:12,margin:0}}>소정초등학교 · 시설·교구 통합 예약</p>
      </div>

      <NoticeBanner notices={props.notices} />

      <div style={{width:"100%",maxWidth:380,background:"rgba(255,255,255,.07)",borderRadius:18,padding:5,marginBottom:16,display:"flex",border:"1px solid rgba(255,255,255,.1)"}}>
        {[["login"," 로그인"],["signup"," 회원가입"]].map(function(item){
          return <button key={item[0]} onClick={function(){ switchMode(item[0]); }} style={{flex:1,border:"none",borderRadius:13,padding:11,fontSize:13,fontWeight:800,cursor:"pointer",transition:"all .22s",background:mode===item[0]?"white":"transparent",color:mode===item[0]?"#312e81":"rgba(255,255,255,.45)"}}>{item[1]}</button>;
        })}
      </div>

      <div style={{width:"100%",maxWidth:380,background:"rgba(255,255,255,.07)",backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,.13)",borderRadius:24,padding:"26px 22px"}}>

        {mode==="login"&&(
          <div>
            <div style={{marginBottom:14}}>
              <label style={{color:"rgba(255,255,255,.65)",fontSize:11,fontWeight:700,display:"block",marginBottom:6}}>아이디</label>
              <input value={id} onChange={function(e){setId(e.target.value);setErr("");}} onKeyDown={function(e){if(e.key==="Enter")login();}} placeholder="아이디 입력" style={inputStyle}/>
            </div>
            <div style={{marginBottom:16,position:"relative"}}>
              <label style={{color:"rgba(255,255,255,.65)",fontSize:11,fontWeight:700,display:"block",marginBottom:6}}>비밀번호</label>
              <input type={showPw?"text":"password"} value={pw} onChange={function(e){setPw(e.target.value);setErr("");}} onKeyDown={function(e){if(e.key==="Enter")login();}} placeholder="비밀번호 입력" style={Object.assign({},inputStyle,{paddingRight:46})}/>
              <button onClick={function(){setShowPw(function(v){return !v;});}} style={{position:"absolute",right:14,bottom:14,background:"none",border:"none",color:"rgba(255,255,255,.4)",cursor:"pointer",fontSize:17,padding:0}}>{showPw?"":""}</button>
            </div>
            {err&&<div style={{background:"rgba(239,68,68,.14)",border:"1px solid rgba(239,68,68,.32)",borderRadius:11,padding:"10px 14px",marginBottom:14,color:"#fca5a5",fontSize:12,fontWeight:600,textAlign:"center"}}>[경고] {err}</div>}
            <div onClick={function(){setAutoLogin(function(v){return !v;});}} style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,cursor:"pointer",userSelect:"none"}}>
              <div style={{width:22,height:22,borderRadius:7,border:"2px solid "+(autoLogin?"#818cf8":"rgba(255,255,255,.25)"),background:autoLogin?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",flexShrink:0}}>
                {autoLogin&&<span style={{color:"white",fontSize:13,fontWeight:900}}>✓</span>}
              </div>
              <span style={{color:"rgba(255,255,255,.8)",fontSize:13,fontWeight:700}}>로그인 상태 유지</span>
            </div>
            <button onClick={login} disabled={loading||!id||!pw} style={{width:"100%",background:(loading||!id||!pw)?"rgba(255,255,255,.09)":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white",border:"none",borderRadius:14,padding:15,fontSize:15,fontWeight:800,cursor:(loading||!id||!pw)?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:20}}>
              {loading?<Spinner size={18} label="로그인 중..."/>:"로그인 →"}
            </button>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/>
              <span style={{color:"rgba(255,255,255,.28)",fontSize:11}}>빠른 체험</span>
              <div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
              {[{id:"teacher1",pw:"1234",name:"김서블",avatar:"",role:"teacher"},{id:"teacher2",pw:"1234",name:"이민준",avatar:"",role:"teacher"},{id:"admin",pw:"0000",name:"홍관리",avatar:"",role:"admin"}].map(function(a){
                return <div key={a.id} onClick={function(){setId(a.id);setPw(a.pw);setErr("");}} style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",borderRadius:14,padding:"12px 8px",textAlign:"center",cursor:"pointer"}}>
                  <div style={{fontSize:22,marginBottom:5}}>{a.avatar}</div>
                  <div style={{color:"white",fontSize:11,fontWeight:800}}>{a.name}</div>
                  <div style={{color:"rgba(255,255,255,.38)",fontSize:10,marginTop:3}}>{a.role==="admin"?"관리자":"선생님"}</div>
                </div>;
              })}
            </div>
          </div>
        )}

        {mode==="signup"&&(
          done?(
            <div style={{textAlign:"center",padding:"28px 0"}}>
              <div style={{width:72,height:72,borderRadius:24,background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 16px"}}></div>
              <h3 style={{color:"white",fontSize:19,fontWeight:900,margin:"0 0 8px"}}>가입 완료!</h3>
              <p style={{color:"rgba(255,255,255,.5)",fontSize:13,margin:0}}>잠시 후 로그인 화면으로 이동해요</p>
            </div>
          ):(
            <div>
              {[{l:"이름",k:"name",ph:"홍길동"},{l:"아이디(4자 이상)",k:"id",ph:"사용할 아이디"},{l:"이메일",k:"email",ph:"예: teacher@school.kr"},{l:"담당 과목",k:"subject",ph:"예: 정보AI, 과학"}].map(function(field){
                return <div key={field.k} style={{marginBottom:14}}>
                  <label style={{color:"rgba(255,255,255,.65)",fontSize:11,fontWeight:700,display:"block",marginBottom:6}}>{field.l}{field.k==="email"&&<span style={{color:"rgba(255,255,255,.35)",fontWeight:400,marginLeft:4}}>(알림 수신용)</span>}</label>
                  <input type={field.k==="email"?"email":"text"} value={form[field.k]||""} onChange={setF(field.k)} placeholder={field.ph} style={inputStyle}/>
                </div>;
              })}
              <div style={{marginBottom:14,position:"relative"}}>
                <label style={{color:"rgba(255,255,255,.65)",fontSize:11,fontWeight:700,display:"block",marginBottom:6}}>비밀번호(4자 이상)</label>
                <input type={showSpw?"text":"password"} value={form.pw} onChange={setF("pw")} placeholder="비밀번호" style={Object.assign({},inputStyle,{paddingRight:46})}/>
                <button onClick={function(){setShowSpw(function(v){return !v;});}} style={{position:"absolute",right:14,bottom:14,background:"none",border:"none",color:"rgba(255,255,255,.4)",cursor:"pointer",fontSize:17,padding:0}}>{showSpw?"":""}</button>
              </div>
              <div style={{marginBottom:14,position:"relative"}}>
                <label style={{color:"rgba(255,255,255,.65)",fontSize:11,fontWeight:700,display:"block",marginBottom:6}}>비밀번호 확인</label>
                <input type="password" value={form.pwCheck} onChange={setF("pwCheck")} placeholder="비밀번호 재입력" style={Object.assign({},inputStyle,{paddingRight:46})}/>
                {form.pwCheck&&<span style={{position:"absolute",right:14,bottom:14,fontSize:16}}>{form.pw===form.pwCheck?"[완료]":"[거절]"}</span>}
              </div>
              <div style={{marginBottom:18}}>
                <label style={{color:"rgba(255,255,255,.65)",fontSize:11,fontWeight:700,display:"block",marginBottom:8}}>역할</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  {[["teacher","선생님"],["admin","관리자"]].map(function(item){
                    return <button key={item[0]} onClick={function(){setForm(function(v){return Object.assign({},v,{role:item[0]});});}} style={{background:form.role===item[0]?"rgba(99,102,241,.35)":"rgba(255,255,255,.07)",border:form.role===item[0]?"1.5px solid #818cf8":"1.5px solid rgba(255,255,255,.12)",borderRadius:13,padding:"12px 8px",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>{item[1]}</button>;
                  })}
                </div>
              </div>
              {signErr&&<div style={{background:"rgba(239,68,68,.14)",border:"1px solid rgba(239,68,68,.32)",borderRadius:11,padding:"10px 14px",marginBottom:14,color:"#fca5a5",fontSize:12,fontWeight:600,textAlign:"center"}}>[경고] {signErr}</div>}
              <button onClick={signup} disabled={loading} style={{width:"100%",background:"linear-gradient(135deg,#10b981,#059669)",color:"white",border:"none",borderRadius:14,padding:15,fontSize:15,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {loading?<Spinner size={18} label="가입 중..."/>:"회원가입 완료 ✓"}
              </button>
            </div>
          )
        )}
      </div>
      <p style={{color:"rgba(255,255,255,.18)",fontSize:11,marginTop:20,textAlign:"center"}}>데모 비밀번호: 선생님 1234 · 관리자 0000</p>
    </div>
  );
}

// ── 입실 확인 페이지 (/checkin?id=...) ───
function CheckInPage() {
  var params = new URLSearchParams(window.location.search);
  var resId    = params.get("id");
  var facility = params.get("facility");
  var date     = params.get("date");
  var time     = params.get("time");
  var teacher  = params.get("teacher");

  var [status, setStatus]   = useState("loading"); // loading | ok | error | notfound
  var [resData, setResData] = useState(null);
  var [checkedIn, setCheckedIn] = useState(false);

  useEffect(function(){
    if(!resId){ setStatus("notfound"); return; }
    sb.get("reservations","select=*&id=eq."+resId)
      .then(function(rows){
        if(!rows||rows.length===0){ setStatus("notfound"); return; }
        var r = rows[0];
        setResData(r);
        if(r.status==="승인") setStatus("ok");
        else if(r.status==="대기") setStatus("pending");
        else setStatus("rejected");
      })
      .catch(function(){ setStatus("error"); });
  }, []);

  function doCheckIn(){
    if(!resData) return;
    sb.patch("reservations","id=eq."+resData.id,{status:"입실완료"})
      .then(function(){
        setCheckedIn(true);
        setStatus("done");
      })
      .catch(function(){ alert("오류가 발생했어요. 다시 시도해주세요."); });
  }

  var bg = "linear-gradient(145deg,#0f0c29,#302b63,#24243e)";

  return (
    <div style={{minHeight:"100vh",background:bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",fontFamily:"sans-serif"}}>
      <style>{CSS}</style>

      {/* 로고 */}
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{width:60,height:60,borderRadius:20,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,margin:"0 auto 12px"}}>[학교]</div>
        <h1 style={{color:"white",fontSize:18,fontWeight:900,margin:"0 0 4px"}}>소정초등학교</h1>
        <p style={{color:"rgba(255,255,255,.45)",fontSize:12,margin:0}}>스마트 예약 시스템 · 입실 확인</p>
      </div>

      <div style={{width:"100%",maxWidth:360,background:"rgba(255,255,255,.08)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,.13)",borderRadius:24,padding:"28px 22px",textAlign:"center"}}>

        {/* 로딩 */}
        {status==="loading" && (
          <div style={{padding:"24px 0"}}>
            <Spinner size={36} label="예약 정보 확인 중..."/>
          </div>
        )}

        {/* 승인 완료 - 입실 가능 */}
        {status==="ok" && !checkedIn && resData && (
          <div>
            <div style={{width:64,height:64,borderRadius:20,background:"rgba(16,185,129,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 14px"}}>[완료]</div>
            <h2 style={{color:"white",fontSize:20,fontWeight:900,margin:"0 0 20px"}}>입실 가능합니다!</h2>
            <div style={{background:"rgba(255,255,255,.06)",borderRadius:14,padding:"14px 16px",marginBottom:20,textAlign:"left"}}>
              {[
                ["시설",resData.facility_name||facility],
                ["날짜",resData.date||date],
                ["교시",resData.time_slot||time],
                ["선생님",(resData.teacher_name||teacher)+" 선생님"],
                ["목적",resData.purpose||"-"],
              ].map(function(kv){
                return (
                  <div key={kv[0]} style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:13}}>
                    <span style={{color:"rgba(255,255,255,.45)"}}>{kv[0]}</span>
                    <span style={{color:"white",fontWeight:700}}>{kv[1]}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={doCheckIn} style={{width:"100%",background:"linear-gradient(135deg,#10b981,#059669)",color:"white",border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:900,cursor:"pointer",boxShadow:"0 6px 20px rgba(16,185,129,.4)"}}>
              입실 확인 완료
            </button>
          </div>
        )}

        {/* 입실 완료 */}
        {(status==="done"||checkedIn) && (
          <div style={{padding:"16px 0"}}>
            <div style={{width:72,height:72,borderRadius:24,background:"rgba(16,185,129,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 14px"}}></div>
            <h2 style={{color:"#34d399",fontSize:22,fontWeight:900,margin:"0 0 8px"}}>입실 완료!</h2>
            <p style={{color:"rgba(255,255,255,.6)",fontSize:14,margin:"0 0 20px",lineHeight:1.7}}>
              {(resData&&resData.facility_name)||facility}<br/>
              {(resData&&resData.time_slot)||time} 입실이 확인됐어요
            </p>
            <div style={{background:"rgba(52,211,153,.1)",border:"1px solid rgba(52,211,153,.3)",borderRadius:12,padding:"12px",fontSize:13,color:"#34d399",fontWeight:600}}>
              입실 시각: {new Date().toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}
            </div>
          </div>
        )}

        {/* 대기 중 */}
        {status==="pending" && (
          <div style={{padding:"16px 0"}}>
            <div style={{width:64,height:64,borderRadius:20,background:"rgba(251,191,36,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 14px"}}>[대기]</div>
            <h2 style={{color:"#fbbf24",fontSize:20,fontWeight:900,margin:"0 0 8px"}}>승인 대기 중</h2>
            <p style={{color:"rgba(255,255,255,.55)",fontSize:13,lineHeight:1.7,margin:0}}>
              아직 관리자 승인이 완료되지 않았어요.<br/>승인 후 다시 스캔해주세요.
            </p>
          </div>
        )}

        {/* 거절됨 */}
        {status==="rejected" && (
          <div style={{padding:"16px 0"}}>
            <div style={{width:64,height:64,borderRadius:20,background:"rgba(239,68,68,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 14px"}}>[거절]</div>
            <h2 style={{color:"#f87171",fontSize:20,fontWeight:900,margin:"0 0 8px"}}>예약 거절됨</h2>
            <p style={{color:"rgba(255,255,255,.55)",fontSize:13,lineHeight:1.7,margin:0}}>
              이 예약은 관리자에 의해 거절됐어요.<br/>새로운 예약을 신청해주세요.
            </p>
          </div>
        )}

        {/* 찾을 수 없음 */}
        {status==="notfound" && (
          <div style={{padding:"16px 0"}}>
            <div style={{fontSize:40,marginBottom:14}}>[검색]</div>
            <h2 style={{color:"white",fontSize:18,fontWeight:900,margin:"0 0 8px"}}>예약 정보를 찾을 수 없어요</h2>
            <p style={{color:"rgba(255,255,255,.5)",fontSize:13,margin:0}}>QR코드가 만료됐거나 잘못된 코드예요.</p>
          </div>
        )}

        {/* 오류 */}
        {status==="error" && (
          <div style={{padding:"16px 0"}}>
            <div style={{fontSize:40,marginBottom:14}}>[경고]</div>
            <h2 style={{color:"#fca5a5",fontSize:18,fontWeight:900,margin:"0 0 8px"}}>연결 오류</h2>
            <p style={{color:"rgba(255,255,255,.5)",fontSize:13,margin:0}}>네트워크를 확인하고 다시 시도해주세요.</p>
          </div>
        )}

      </div>

      <button onClick={function(){ window.location.href="/"; }} style={{marginTop:20,background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.15)",borderRadius:12,padding:"10px 24px",color:"rgba(255,255,255,.55)",fontSize:12,fontWeight:700,cursor:"pointer"}}>
        메인으로 돌아가기
      </button>
    </div>
  );
}

// ── 메인 앱 ──────────────────────────────
export default function App() {
  // /checkin 경로면 입실 확인 페이지 표시
  if(window.location.pathname === "/checkin") return <CheckInPage />;

  var [user,setUser]       = useState(savedSession);
  var [tab,setTab]         = useState("home");
  var [facList,setFacList] = useState([]);
  var [itemList,setItemList]= useState([]);
  var [res,setRes]         = useState([]);
  var [loadingData,setLoadingData] = useState(false);
  var [modal,setModal]     = useState(null);
  var [step,setStep]       = useState(0);
  var [book,setBook]       = useState({date:"",time:"",purpose:""});
  var [qr,setQr]           = useState(null);
  var [toast,setToast]     = useState(null);
  var [cat,setCat]         = useState("전체");
  var [regModal,setRegModal]= useState(null);
  var [regForm,setRegForm] = useState({});
  var [delConfirm,setDelConfirm] = useState(null);
  var [notifs,setNotifs]       = useState([]);
  var [notiPanel,setNotiPanel] = useState(false);
  var [editEmail,setEditEmail] = useState("");
  var [savingEmail,setSavingEmail] = useState(false);
  var [showMoreDates,setShowMoreDates] = useState(false);
  var [calMonth,setCalMonth]           = useState(0);
  var [notices,setNotices]             = useState([
    { id:1, type:"urgent", icon:"[긴급]", title:"긴급", text:"오늘 오후 과학실 누수로 3~6교시 사용 불가합니다.", date:"오늘" },
    { id:2, type:"info",   icon:"[공지]", title:"공지", text:"5/15(목) 전 시설 예약이 제한됩니다.", date:"5/12" },
    { id:3, type:"new",    icon:"[안내]", title:"안내", text:"태블릿 세트 10대 신규 입고되었습니다.", date:"5/10" },
    { id:4, type:"info",   icon:"[점검]", title:"점검", text:"매주 금요일 오후 컴퓨터실 정기 점검이 있습니다.", date:"상시" },
  ]);
  var [noticeModal,setNoticeModal]     = useState(null); // 0=이번달, 1=다음달...

  // ── DB에서 데이터 불러오기 ──
  function loadAll(){
    setLoadingData(true);
    Promise.all([
      sb.get("facilities","select=*&order=id"),
      sb.get("items","select=*&order=id"),
      sb.get("reservations","select=*&order=created_at.desc"),
      sb.get("notifications","select=*&order=created_at.desc&limit=30"),
    ]).then(function(results){
      setFacList(results[0]||[]);
      setItemList(results[1]||[]);
      setRes(results[2]||[]);
      setNotifs(results[3]||[]);
      setLoadingData(false);
    }).catch(function(e){
      console.error("데이터 로딩 오류:", e);
      setLoadingData(false);
    });
  }

  useEffect(function(){
    if(user) { loadAll(); setEditEmail(user.email||""); }
  }, [user]);

  // 알림 30초마다 자동 갱신
  useEffect(function(){
    if(!user) return;
    var timer = setInterval(function(){
      sb.get("notifications","select=*&order=created_at.desc&limit=30")
        .then(function(rows){ setNotifs(rows||[]); })
        .catch(function(){});
    }, 30000);
    return function(){ clearInterval(timer); };
  }, [user]);

  if(!user) return <LoginScreen
    notices={notices}
    onLogin={function(u){ setUser(u); }}
    onRegister={function(a){ console.log("가입됨",a); }}
  />;

  function logout(){ savedSession=null; setUser(null); setTab("home"); }
  function notify(msg,type){ setToast({msg:msg,type:type||"ok"}); setTimeout(function(){ setToast(null); },2800); }

  // ── 예약 신청 → DB 저장 ──
  function confirmBook(item){
    var targetDate = book.date||fmtDate(today,0);
    var targetTime = book.time||TIME_SLOTS[0];

    // ── 중복 체크 1: 로컬 상태 즉시 확인 ──
    var localDup = res.find(function(r){
      return r.facility_name===item.name
        && r.date===targetDate
        && r.time_slot===targetTime
        && r.status!=="거절";
    });
    if(localDup){
      notify("["+targetTime+"] "+item.name+"은 이미 "+localDup.status+" 상태예요!", "err");
      return;
    }

    var data = {
      facility_name: item.name,
      icon: item.icon,
      date: targetDate,
      time_slot: targetTime,
      teacher_name: user.name,
      purpose: book.purpose||"수업 활용",
      status: "대기",
    };

    // ── 중복 체크 2: DB에서 전체 조회 후 JS로 필터 (한글 인코딩 문제 우회) ──
    sb.get("reservations",
      "select=id,status,facility_name,date,time_slot"+
      "&facility_name=eq."+encodeURIComponent(item.name)+
      "&date=eq."+encodeURIComponent(targetDate)+
      "&time_slot=eq."+encodeURIComponent(targetTime)
    ).then(function(rows){
      var dup = (rows||[]).find(function(r){
        return r.status==="대기" || r.status==="승인";
      });
      if(dup){
        loadAll();
        notify("["+targetTime+"] "+item.name+"은 이미 "+dup.status+" 상태예요!", "err");
        return;
      }
      sb.post("reservations", data)
        .then(function(saved){
          var r = (saved&&saved[0]) ? saved[0] : Object.assign({id:Date.now()},data);
          setRes(function(v){ return [r].concat(v); });
          setModal(null); setStep(0); setBook({date:"",time:"",purpose:""});
          notify(item.name+" 예약 신청 완료! ");
        })
        .catch(function(e){ notify("예약 오류: "+e.message,"err"); });
    }).catch(function(e){ notify("확인 오류: "+e.message,"err"); });
  }

  // ── 관리: 시설 등록/수정 ──
  function openReg(type, editing){
    editing = editing||null;
    var def = type==="facility"
      ? {name:"",icon:"(과학)",floor:"",capacity:"",color:"#3b82f6",category:"특별실"}
      : {name:"",icon:"(태블릿)",stock:"",color:"#06b6d4",category:"교구"};
    setRegForm(editing?Object.assign({},editing):def);
    setRegModal({type:type,editing:editing});
  }
  function saveReg(){
    var type=regModal.type, editing=regModal.editing;
    if(!regForm.name||!regForm.name.trim()) return notify("이름을 입력하세요","err");
    if(type==="facility"){
      if(!regForm.floor||!regForm.floor.trim()) return notify("위치를 입력하세요","err");
      if(!regForm.capacity) return notify("수용 인원을 입력하세요","err");
      var fData = {name:regForm.name,icon:regForm.icon,floor:regForm.floor,capacity:Number(regForm.capacity),color:regForm.color,category:regForm.category||"특별실"};
      if(editing){
        sb.patch("facilities","id=eq."+editing.id,fData)
          .then(function(){ setFacList(function(v){ return v.map(function(f){ return f.id===editing.id?Object.assign({},f,fData):f; }); }); notify("수정됐어요 "); setRegModal(null); })
          .catch(function(e){ notify("오류: "+e.message,"err"); });
      } else {
        sb.post("facilities",fData)
          .then(function(rows){ var r=(rows&&rows[0])||Object.assign({id:Date.now()},fData); setFacList(function(v){ return v.concat([r]); }); notify(fData.name+" 등록 완료! [학교]"); setRegModal(null); })
          .catch(function(e){ notify("오류: "+e.message,"err"); });
      }
    } else {
      if(!regForm.stock) return notify("재고 수량을 입력하세요","err");
      var iData = {name:regForm.name,icon:regForm.icon,stock:Number(regForm.stock),color:regForm.color,category:regForm.category||"교구"};
      if(editing){
        sb.patch("items","id=eq."+editing.id,iData)
          .then(function(){ setItemList(function(v){ return v.map(function(i){ return i.id===editing.id?Object.assign({},i,iData):i; }); }); notify("수정됐어요 "); setRegModal(null); })
          .catch(function(e){ notify("오류: "+e.message,"err"); });
      } else {
        sb.post("items",iData)
          .then(function(rows){ var r=(rows&&rows[0])||Object.assign({id:Date.now()},iData); setItemList(function(v){ return v.concat([r]); }); notify(iData.name+" 등록 완료! [교구]"); setRegModal(null); })
          .catch(function(e){ notify("오류: "+e.message,"err"); });
      }
    }
  }
  function deleteItem(type, id){
    var table = type==="facility"?"facilities":"items";
    sb.delete(table,"id=eq."+id)
      .then(function(){
        if(type==="facility") setFacList(function(v){ return v.filter(function(f){ return f.id!==id; }); });
        else setItemList(function(v){ return v.filter(function(i){ return i.id!==id; }); });
        setDelConfirm(null); notify("삭제됐어요");
      })
      .catch(function(e){ notify("오류: "+e.message,"err"); });
  }
  function setRF(k){ return function(e){ setRegForm(function(v){ var n=Object.assign({},v); n[k]=e.target.value; return n; }); }; }

  function addNotif(recipientName, message, type, reservationId){
    console.log("addNotif 호출됨:", recipientName, message);
    // sbFetch 헬퍼 우회 — fetch 직접 호출
    fetch(SUPABASE_URL+"/rest/v1/notifications", {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer "+SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
        recipient_name: recipientName,
        message: message,
        type: type||"info",
        is_read: false,
      }),
    })
    .then(function(res){
      console.log("알림 응답 status:", res.status);
      return res.text();
    })
    .then(function(text){
      console.log("알림 응답 body:", text);
      try {
        var rows = JSON.parse(text);
        var n = (rows&&rows[0])||{id:Date.now(),created_at:new Date().toISOString(),recipient_name:recipientName,message:message,type:type||"info",is_read:false};
        setNotifs(function(v){ return [n].concat(v); });
        notify("알림 전송 완료!", "ok");
      } catch(e) { console.error("파싱 오류:", e, text); }
    })
    .catch(function(e){
      console.error("알림 fetch 오류:", e);
      notify("알림 오류: "+e.message, "err");
    });
  }

  function refreshNotifs(){
    sb.get("notifications","select=*&order=created_at.desc&limit=30")
      .then(function(rows){ setNotifs(rows||[]); })
      .catch(function(){});
  }

  function markAllRead(){
    var myUnread = notifs.filter(function(n){ return n.recipient_name===user.name && !n.is_read; });
    if(myUnread.length===0) return;
    myUnread.forEach(function(n){
      sb.patch("notifications","id=eq."+n.id,{is_read:true}).catch(function(){});
    });
    setNotifs(function(v){ return v.map(function(n){
      return n.recipient_name===user.name ? Object.assign({},n,{is_read:true}) : n;
    }); });
  }

  function approveRes(id, status) {
    var target = res.find(function(r){ return r.id == id; });

    // target 없으면 DB에서 직접 조회 후 처리
    if(!target){
      fetch(SUPABASE_URL+"/rest/v1/reservations?id=eq."+id, {
        headers:{"apikey":SUPABASE_KEY,"Authorization":"Bearer "+SUPABASE_KEY}
      })
      .then(function(r){ return r.json(); })
      .then(function(rows){
        var dbTarget = rows&&rows[0];
        if(dbTarget) processApproval(id, status, dbTarget);
      }).catch(function(e){ console.error("DB 조회 오류:", e); });
    }

    sb.patch("reservations","id=eq."+id,{status:status})
      .then(function(){
        setRes(function(v){ return v.map(function(r){ return r.id==id ? Object.assign({},r,{status:status}) : r; }); });
        notify(status==="승인" ? "예약이 승인됐어요!" : "예약이 거절됐어요", status==="승인"?"ok":"err");
        if(target) processApproval(id, status, target);
      })
      .catch(function(e){ notify("오류: "+e.message,"err"); });
  }

  function saveEmail(){
    if(!editEmail.trim()) return notify("이메일을 입력해주세요","err");
    setSavingEmail(true);
    sb.patch("users","login_id=eq."+user.login_id,{email:editEmail.trim()})
      .then(function(){
        setUser(function(u){ return Object.assign({},u,{email:editEmail.trim()}); });
        setSavingEmail(false);
        notify("이메일이 저장됐어요! 이제 알림을 받을 수 있어요","ok");
      })
      .catch(function(e){ setSavingEmail(false); notify("저장 오류: "+e.message,"err"); });
  }

  function processApproval(id, status, target){
    // 1. 앱 내 알림
    var msg = status==="승인"
      ? target.facility_name+" "+target.time_slot+" 예약이 승인됐어요!"
      : target.facility_name+" "+target.time_slot+" 예약이 거절됐어요.";
    addNotif(target.teacher_name, msg, status==="승인"?"success":"error", id);

    // 2. 이메일 발송 — users 테이블에서 이메일 조회
    console.log("이메일 조회 시작:", target.teacher_name);
    sb.get("users","select=email,name&name=eq."+encodeURIComponent(target.teacher_name))
      .then(function(rows){
        console.log("users 조회 결과:", rows);
        var email = rows&&rows[0]&&rows[0].email;
        console.log("발송할 이메일:", email);
        if(email){
          sendEmail(email, target.teacher_name, target.facility_name, target.date, target.time_slot, target.purpose, status)
            .then(function(){ notify("이메일 발송 완료! ","ok"); });
        } else {
          notify("이메일 미등록 — 앱 알림만 전송됨","ok");
        }
      })
      .catch(function(e){ console.error("이메일 조회 오류:", e); });
  }

  var allItems = itemList; // 교구·기기만 (특별실 제외)
  var filtered = cat==="전체" ? allItems : allItems.filter(function(i){ return i.category===cat; });
  var todayStr = fmtDate(today,0);
  var todayR   = res.filter(function(r){ return r.date===todayStr; });
  var myR      = res.filter(function(r){ return r.teacher_name===user.name; });
  var pending  = res.filter(function(r){ return r.status==="대기"; }).length;
  var myNotifs = notifs.filter(function(n){ return n.recipient_name===user.name; });
  var unreadCnt= myNotifs.filter(function(n){ return !n.is_read; }).length;

  var TABS=[["home","","홈"],["facilities","[학교]","시설"],["items","[교구]","교구"],["mypage","[목록]","내 예약"]];
  if(user.role==="admin") TABS.push(["manage","[관리]","관리"]);

  return (
    <div style={{fontFamily:"sans-serif",minHeight:"100vh",background:"#f5f7fa",color:"#1e293b",maxWidth:430,margin:"0 auto",position:"relative",boxShadow:"0 0 60px rgba(0,0,0,.14)"}}>
      <style>{CSS}</style>

      {toast&&<div style={{position:"fixed",top:22,left:"50%",transform:"translateX(-50%)",background:toast.type==="ok"?"linear-gradient(135deg,#10b981,#059669)":"#ef4444",color:"white",padding:"13px 26px",borderRadius:99,fontWeight:700,fontSize:13,zIndex:9999,whiteSpace:"nowrap",animation:"toastAnim .3s ease"}}>{toast.msg}</div>}

      {/* 알림 패널 */}
      {notiPanel&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"column"}} onClick={function(){ setNotiPanel(false); }}>
          <div style={{position:"absolute",top:0,right:0,width:"100%",maxWidth:430,background:"white",borderRadius:"0 0 20px 20px",boxShadow:"0 8px 32px rgba(0,0,0,.18)",maxHeight:"70vh",display:"flex",flexDirection:"column",animation:"fadeUp .25s ease"}} onClick={function(e){ e.stopPropagation(); }}>
            {/* 패널 헤더 */}
            <div style={{padding:"16px 18px 12px",borderBottom:"1px solid #e8ecf0",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>[알림]</span>
                <span style={{fontWeight:800,fontSize:15,color:"#1e293b"}}>알림</span>
                {unreadCnt>0&&<span style={{background:"#ef4444",color:"white",fontSize:10,fontWeight:900,borderRadius:99,padding:"2px 7px"}}>{unreadCnt}</span>}
              </div>
              <button onClick={function(){ setNotiPanel(false); }} style={{background:"none",border:"none",color:"#94a3b8",fontSize:18,cursor:"pointer",padding:0}}>✕</button>
            </div>
            {/* 알림 목록 */}
            <div style={{overflowY:"auto",flex:1}}>
              {myNotifs.length===0?(
                <div style={{textAlign:"center",padding:"40px 20px",color:"#94a3b8"}}>
                  <div style={{fontSize:36,marginBottom:10}}>[무음]</div>
                  <div style={{fontSize:13,fontWeight:600}}>아직 알림이 없어요</div>
                </div>
              ):myNotifs.map(function(n){
                var icon = n.type==="success"?"[완료]":n.type==="error"?"[거절]":"[정보]";
                var bg   = n.is_read?"transparent":"#f8f7ff";
                var time = new Date(n.created_at).toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"});
                return (
                  <div key={n.id} style={{padding:"13px 18px",borderBottom:"1px solid #f1f5f9",background:bg,display:"flex",gap:12,alignItems:"flex-start"}}>
                    <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:13,fontWeight:n.is_read?400:700,color:"#1e293b",margin:"0 0 4px",lineHeight:1.5}}>{n.message}</p>
                      <span style={{fontSize:11,color:"#94a3b8"}}>{time}</span>
                    </div>
                    {!n.is_read&&<div style={{width:8,height:8,borderRadius:99,background:"#6366f1",flexShrink:0,marginTop:4}}></div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div style={{background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4338ca 100%)",padding:"22px 20px 36px",position:"relative",overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"relative"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{width:28,height:28,borderRadius:9,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>[학교]</div>
              <p style={{color:"rgba(255,255,255,.55)",fontSize:12,margin:0,fontWeight:600}}>소정초등학교</p>
            </div>
            <h1 style={{color:"white",fontSize:20,fontWeight:900,margin:"0 0 6px"}}>스마트 예약 시스템</h1>
            <p style={{color:"rgba(255,255,255,.6)",fontSize:12,margin:0}}>{today.getMonth()+1}월 {today.getDate()}일({DAY_KR[today.getDay()]}) · {user.name} {user.role==="admin"?"관리자":"선생님"}</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:7,alignItems:"flex-end"}}>
            {/* 알림 벨 */}
            <div onClick={function(){
                refreshNotifs();
                setNotiPanel(function(v){ return !v; });
                if(!notiPanel) setTimeout(markAllRead, 500);
              }}
              style={{background:"rgba(255,255,255,.13)",border:"1px solid rgba(255,255,255,.18)",borderRadius:14,padding:"9px 14px",textAlign:"center",cursor:"pointer",minWidth:56,position:"relative"}}>
              <div style={{fontSize:20}}>[알림]</div>
              <div style={{color:"white",fontSize:10,fontWeight:700,marginTop:2}}>알림</div>
              {unreadCnt>0&&(
                <div style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"white",fontSize:9,fontWeight:900,borderRadius:99,width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",animation:"pulse 2s infinite"}}>{unreadCnt}</div>
              )}
            </div>
            <button onClick={logout} style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"6px 10px",color:"rgba(255,255,255,.5)",fontSize:10,fontWeight:700,cursor:"pointer"}}>로그아웃</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:20}}>
          {[{l:"오늘 예약",v:todayR.length,u:"건",c:"#a5b4fc"},{l:"대기 중",v:pending,u:"건",c:"#fcd34d"},{l:"이용 가능",v:facList.length,u:"개",c:"#6ee7b7"}].map(function(s){
            return <div key={s.l} style={{background:"rgba(255,255,255,.1)",backdropFilter:"blur(10px)",borderRadius:15,padding:"13px 10px",textAlign:"center",border:"1px solid rgba(255,255,255,.12)"}}>
              <div style={{color:s.c,fontSize:22,fontWeight:900,lineHeight:1}}>{s.v}<span style={{fontSize:12,fontWeight:700}}>{s.u}</span></div>
              <div style={{color:"rgba(255,255,255,.55)",fontSize:10,marginTop:4,fontWeight:600}}>{s.l}</div>
            </div>;
          })}
        </div>
      </div>

      {/* 탭 */}
      <div style={{background:"white",display:"flex",borderBottom:"1px solid #e8ecf0",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,.06)"}}>
        {TABS.map(function(item){
          return <button key={item[0]} onClick={function(){ setTab(item[0]); }} style={{flex:1,border:"none",background:"none",padding:"12px 0 10px",cursor:"pointer",borderBottom:tab===item[0]?"2.5px solid #6366f1":"2.5px solid transparent",color:tab===item[0]?"#6366f1":"#94a3b8",fontWeight:tab===item[0]?800:500,fontSize:11,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <span style={{fontSize:18}}>{item[1]}</span>{item[2]}
          </button>;
        })}
      </div>

      <div style={{paddingBottom:80}}>
        {loadingData&&<Spinner full={true} label="데이터 불러오는 중..."/>}

        {/* ─ 홈 ─ */}
        {!loadingData&&tab==="home"&&(
          <div style={{paddingBottom:8}}>
            <div style={{padding:"20px 16px 0"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <h2 style={{fontSize:15,fontWeight:800,margin:0}}> 이번 주 예약</h2>
                <span style={{color:"#94a3b8",fontSize:11,fontWeight:600}}>{today.getMonth()+1}월</span>
              </div>
              <div style={{background:"white",borderRadius:18,padding:"14px 12px",boxShadow:"0 2px 10px rgba(0,0,0,.06)",marginBottom:22}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
                  {[0,1,2,3,4,5,6].map(function(offset){
                    var d=new Date(today); d.setDate(d.getDate()-today.getDay()+offset);
                    var dStr=(d.getMonth()+1)+"/"+d.getDate()+"("+DAY_KR[d.getDay()]+")";
                    var dayRes=res.filter(function(r){ return r.date===dStr; });
                    var isToday=d.toDateString()===today.toDateString();
                    var isWeekend=d.getDay()===0||d.getDay()===6;
                    return (
                      <div key={offset} style={{textAlign:"center"}}>
                        <div style={{fontSize:10,fontWeight:700,color:isWeekend?"#ef4444":"#94a3b8",marginBottom:5}}>{DAY_KR[d.getDay()]}</div>
                        <div style={{width:32,height:32,borderRadius:99,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center",background:isToday?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent",border:isToday?"none":"1.5px solid #e8ecf0",fontSize:12,fontWeight:isToday?900:600,color:isToday?"white":isWeekend?"#ef4444":"#374151"}}>{d.getDate()}</div>
                        <div style={{marginTop:5,display:"flex",justifyContent:"center",gap:2,minHeight:8}}>
                          {dayRes.slice(0,3).map(function(r,i){ return <div key={i} style={{width:6,height:6,borderRadius:99,background:r.status==="승인"?"#6366f1":"#fbbf24"}}></div>; })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{display:"flex",gap:14,marginTop:12,paddingTop:10,borderTop:"1px solid #f1f5f9",justifyContent:"flex-end"}}>
                  {[["#6366f1","승인"],["#fbbf24","대기"]].map(function(item){ return <div key={item[1]} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:7,height:7,borderRadius:99,background:item[0]}}></div><span style={{fontSize:10,color:"#94a3b8",fontWeight:600}}>{item[1]}</span></div>; })}
                </div>
              </div>
            </div>
            <div style={{padding:"0 16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <h2 style={{fontSize:15,fontWeight:800,margin:0}}> 빠른 예약</h2>
                <span onClick={function(){ setTab("facilities"); }} style={{color:"#6366f1",fontSize:12,fontWeight:700,cursor:"pointer"}}>전체 보기 →</span>
              </div>
            </div>
            <div style={{overflowX:"auto",paddingLeft:16,paddingBottom:4,marginBottom:22,display:"flex",gap:12}}>
              {facList.map(function(f){
                var bookedToday=res.filter(function(r){ return r.facility_name===f.name&&r.date===todayStr&&r.status==="승인"; });
                var isBusy=bookedToday.length>=3;
                var statusLabel=isBusy?"오늘 마감":"예약 가능";
                var statusBg=isBusy?"#fef3c7":"#dcfce7";
                var statusColor=isBusy?"#d97706":"#16a34a";
                return (
                  <div key={f.id} onClick={function(){ setModal(f); setStep(0); }}
                    style={{background:"white",borderRadius:18,padding:"16px 14px",cursor:"pointer",boxShadow:"0 2px 12px rgba(0,0,0,.08)",flexShrink:0,width:140,borderTop:"4px solid "+f.color,position:"relative"}}>
                    <div style={{position:"absolute",top:10,right:10,background:statusBg,color:statusColor,fontSize:9,fontWeight:800,padding:"3px 7px",borderRadius:99}}>{statusLabel}</div>
                    <div style={{width:40,height:40,borderRadius:12,background:f.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:10}}>{f.icon}</div>
                    <div style={{fontWeight:800,fontSize:13,marginBottom:3,lineHeight:1.3}}>{f.name}</div>
                    <div style={{fontSize:10,color:"#94a3b8"}}>{f.floor}</div>
                    <div style={{fontSize:10,color:"#94a3b8"}}>{f.capacity}명 수용</div>
                  </div>
                );
              })}
              <div style={{flexShrink:0,width:4}}></div>
            </div>
            <div style={{padding:"0 16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <h2 style={{fontSize:15,fontWeight:800,margin:0}}> 오늘의 예약 현황</h2>
                <span style={{background:"#ede9fe",color:"#6366f1",fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:99}}>{todayR.length}건</span>
              </div>
              {todayR.length===0
                ?<div style={{background:"white",borderRadius:18,padding:36,textAlign:"center",color:"#94a3b8",boxShadow:"0 2px 10px rgba(0,0,0,.06)"}}><div style={{fontSize:36,marginBottom:10}}></div><div style={{fontSize:13,fontWeight:600}}>오늘 예약이 없어요</div></div>
                :todayR.map(function(r){
                  return <div key={r.id} onClick={function(){ setQr(r); }} style={{background:"white",borderRadius:18,padding:"15px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:13,boxShadow:"0 2px 10px rgba(0,0,0,.06)",cursor:"pointer"}}>
                    <div style={{width:46,height:46,borderRadius:14,background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{r.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:800,fontSize:14,marginBottom:2}}>{r.facility_name}</div>
                      <div style={{fontSize:12,color:"#64748b"}}>{r.time_slot} · {r.purpose}</div>
                    </div>
                    <span style={{background:r.status==="승인"?"#dcfce7":"#fef3c7",color:r.status==="승인"?"#16a34a":"#d97706",padding:"4px 11px",borderRadius:99,fontSize:11,fontWeight:800,flexShrink:0}}>{r.status}</span>
                  </div>;
                })
              }
            </div>
          </div>
        )}

        {/* ─ 시설 ─ */}
        {!loadingData&&tab==="facilities"&&(
          <div style={{padding:"22px 16px"}}>
            <h2 style={{fontSize:15,fontWeight:800,margin:"0 0 18px"}}>[학교] 특별실 예약</h2>
            {facList.map(function(f){
              return <div key={f.id} onClick={function(){ setModal(f); setStep(0); }} style={{background:"white",borderRadius:20,padding:18,marginBottom:12,display:"flex",gap:16,cursor:"pointer",boxShadow:"0 2px 10px rgba(0,0,0,.06)",borderLeft:"5px solid "+f.color}}>
                <div style={{width:54,height:54,borderRadius:16,background:f.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:27,flexShrink:0}}>{f.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:16,marginBottom:6}}>{f.name}</div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                    {[f.floor,f.capacity+"명",f.category].map(function(t){ return <span key={t} style={{background:"#f1f5f9",color:"#64748b",padding:"4px 9px",borderRadius:99,fontSize:11,fontWeight:600}}>{t}</span>; })}
                  </div>
                </div>
                <div style={{color:"#6366f1",fontWeight:800,fontSize:13,alignSelf:"center",whiteSpace:"nowrap"}}>예약 →</div>
              </div>;
            })}
          </div>
        )}

        {/* ─ 교구 ─ */}
        {!loadingData&&tab==="items"&&(
          <div style={{padding:"22px 16px"}}>
            <div style={{display:"flex",gap:8,marginBottom:20,overflowX:"auto",paddingBottom:2}}>
              {["전체","교구","공용기기"].map(function(c){ return <button key={c} onClick={function(){ setCat(c); }} style={{background:cat===c?"linear-gradient(135deg,#6366f1,#8b5cf6)":"white",color:cat===c?"white":"#64748b",border:"none",borderRadius:20,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",boxShadow:cat===c?"0 4px 14px rgba(99,102,241,.38)":"0 2px 6px rgba(0,0,0,.07)",flexShrink:0}}>{c}</button>; })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {filtered.map(function(item){ return <div key={item.id} onClick={function(){ setModal(item); setStep(0); }} style={{background:"white",borderRadius:20,padding:"18px 15px",cursor:"pointer",boxShadow:"0 2px 10px rgba(0,0,0,.06)",borderTop:"4px solid "+item.color}}>
                <div style={{fontSize:30,marginBottom:10}}>{item.icon}</div>
                <div style={{fontWeight:800,fontSize:13,marginBottom:8,lineHeight:1.35}}>{item.name}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{background:"#f1f5f9",color:"#64748b",padding:"3px 9px",borderRadius:99,fontSize:11,fontWeight:600}}>{item.category}</span>
                  {item.stock&&<span style={{color:"#10b981",fontWeight:800,fontSize:12}}>잔여 {item.stock}</span>}
                </div>
              </div>; })}
            </div>
          </div>
        )}

        {/* ─ 내 예약 ─ */}
        {!loadingData&&tab==="mypage"&&(
          <div style={{padding:"22px 16px"}}>
            <div style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:20,padding:20,marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:52,height:52,borderRadius:16,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{user.avatar||""}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:"white",fontWeight:900,fontSize:17}}>{user.name} {user.role==="admin"?"관리자":"선생님"}</div>
                <div style={{color:"rgba(255,255,255,.7)",fontSize:12,marginTop:3}}>{user.subject} · 예약 {myR.length}건</div>
                <div style={{color:"rgba(255,255,255,.55)",fontSize:11,marginTop:3}}>{user.email||"이메일 미등록"}</div>
              </div>
            </div>

            {/* 이메일 등록·수정 */}
            <div style={{background:"white",borderRadius:16,padding:"14px 16px",marginBottom:18,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
              <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:8}}> 알림 이메일 주소</label>
              <div style={{display:"flex",gap:8}}>
                <input type="email" value={editEmail} onChange={function(e){setEditEmail(e.target.value);}} placeholder="예: teacher@school.kr"
                  style={{flex:1,background:"#f8fafc",border:"1.5px solid #e8ecf0",borderRadius:10,padding:"10px 12px",fontSize:13,fontFamily:"sans-serif",color:"#1e293b"}}/>
                <button onClick={saveEmail} disabled={savingEmail} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white",border:"none",borderRadius:10,padding:"10px 16px",fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0,opacity:savingEmail?0.7:1}}>
                  {savingEmail?"저장 중...":"저장"}
                </button>
              </div>
              <p style={{fontSize:11,color:"#94a3b8",margin:"6px 0 0"}}>예약 승인·거절 시 이 이메일로 알림이 발송돼요</p>
            </div>
            <h2 style={{fontSize:15,fontWeight:800,margin:"0 0 16px"}}>[목록] 내 예약 목록</h2>
            {myR.length===0
              ?<div style={{textAlign:"center",padding:"52px 0",color:"#94a3b8",background:"white",borderRadius:20,boxShadow:"0 2px 10px rgba(0,0,0,.06)"}}><div style={{fontSize:42,marginBottom:12}}></div><div style={{fontSize:14,fontWeight:600}}>예약 내역이 없어요</div></div>
              :myR.map(function(r){
                return <div key={r.id} onClick={function(){ setQr(r); }} style={{background:"white",borderRadius:20,padding:17,marginBottom:12,boxShadow:"0 2px 10px rgba(0,0,0,.06)",cursor:"pointer"}}>
                  <div style={{display:"flex",gap:13,alignItems:"center",marginBottom:r.status==="승인"?12:0}}>
                    <div style={{width:50,height:50,borderRadius:15,background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{r.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:800,fontSize:15,marginBottom:3}}>{r.facility_name}</div>
                      <div style={{fontSize:12,color:"#64748b"}}>{r.date} {r.time_slot}</div>
                      <div style={{fontSize:12,color:"#94a3b8",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.purpose}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
                      <span style={{background:r.status==="승인"?"#dcfce7":"#fef3c7",color:r.status==="승인"?"#16a34a":"#d97706",padding:"4px 12px",borderRadius:99,fontSize:12,fontWeight:800}}>{r.status}</span>
                      {r.status==="승인"&&<span style={{fontSize:11,color:"#6366f1",fontWeight:700}}>QR 보기 →</span>}
                    </div>
                  </div>
                  {r.status==="승인"&&<div style={{background:"#ede9fe",borderRadius:11,padding:"9px 13px",display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:15}}>(태블릿)</span><span style={{fontSize:12,color:"#6366f1",fontWeight:700}}>QR코드로 입실을 확인하세요</span></div>}
                </div>;
              })
            }
          </div>
        )}

        {/* ─ 관리 ─ */}
        {!loadingData&&tab==="manage"&&(
          <div style={{padding:"22px 16px"}}>

            {/* 승인 대기 섹션 */}
            <div style={{background:"linear-gradient(135deg,#d97706,#f59e0b)",borderRadius:18,padding:"16px 18px",marginBottom:6,display:"flex",gap:12,alignItems:"center"}}>
              <div style={{fontSize:26}}>[목록]</div>
              <div style={{flex:1}}>
                <div style={{color:"white",fontWeight:900,fontSize:15}}>예약 승인 관리</div>
                <div style={{color:"rgba(255,255,255,.75)",fontSize:12,marginTop:2}}>대기 중인 예약을 승인하거나 거절하세요</div>
              </div>
              <div style={{background:"rgba(255,255,255,.25)",borderRadius:99,padding:"4px 12px",color:"white",fontWeight:900,fontSize:14}}>
                {res.filter(function(r){ return r.status==="대기"; }).length}건
              </div>
            </div>

            {/* 승인 필터 탭 */}
            {(function(){
              var pendingR = res.filter(function(r){ return r.status==="대기"; });
              var approvedR = res.filter(function(r){ return r.status==="승인"; });
              var rejectedR = res.filter(function(r){ return r.status==="거절"; });
              return (
                <div>
                  <div style={{display:"flex",gap:8,marginBottom:16,marginTop:12}}>
                    {[["전체 예약",res.length,"#6366f1"],["대기",pendingR.length,"#d97706"],["승인",approvedR.length,"#16a34a"],["거절",rejectedR.length,"#ef4444"]].map(function(item){
                      return (
                        <div key={item[0]} style={{flex:1,background:"white",borderRadius:12,padding:"10px 6px",textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
                          <div style={{fontSize:18,fontWeight:900,color:item[2]}}>{item[1]}</div>
                          <div style={{fontSize:10,color:"#94a3b8",marginTop:2,fontWeight:600}}>{item[0]}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 대기 중인 예약 목록 */}
                  <h2 style={{fontSize:14,fontWeight:800,margin:"0 0 12px",color:"#374151"}}>[대기] 대기 중인 예약</h2>
                  {pendingR.length===0
                    ? <div style={{background:"white",borderRadius:16,padding:"28px",textAlign:"center",color:"#94a3b8",marginBottom:24,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
                        <div style={{fontSize:32,marginBottom:8}}>[완료]</div>
                        <div style={{fontSize:13,fontWeight:600}}>대기 중인 예약이 없어요</div>
                      </div>
                    : pendingR.map(function(r){
                        return (
                          <div key={r.id} style={{background:"white",borderRadius:18,padding:"16px",marginBottom:12,boxShadow:"0 2px 10px rgba(0,0,0,.07)",borderLeft:"4px solid #f59e0b"}}>
                            <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
                              <div style={{width:44,height:44,borderRadius:13,background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{r.icon}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontWeight:800,fontSize:14,marginBottom:3}}>{r.facility_name}</div>
                                <div style={{fontSize:12,color:"#64748b"}}>{r.date} · {r.time_slot}</div>
                                <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{r.teacher_name} 선생님</div>
                                <div style={{fontSize:12,color:"#64748b",marginTop:6,background:"#f8fafc",borderRadius:8,padding:"4px 8px"}}>{r.purpose}</div>
                              </div>
                              <span style={{background:"#fef3c7",color:"#d97706",padding:"4px 10px",borderRadius:99,fontSize:11,fontWeight:800,flexShrink:0}}>대기</span>
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                              <button onClick={function(){ approveRes(r.id,"거절"); }} style={{background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:12,padding:"11px",fontSize:13,fontWeight:800,cursor:"pointer"}}>거절</button>
                              <button onClick={function(){ approveRes(r.id,"승인"); }} style={{background:"linear-gradient(135deg,#10b981,#059669)",color:"white",border:"none",borderRadius:12,padding:"11px",fontSize:13,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 12px rgba(16,185,129,.35)"}}>승인 ✓</button>
                            </div>
                          </div>
                        );
                      })
                  }

                  {/* 최근 처리된 예약 */}
                  <h2 style={{fontSize:14,fontWeight:800,margin:"20px 0 12px",color:"#374151"}}> 최근 처리된 예약</h2>
                  {approvedR.concat(rejectedR).length===0
                    ? <div style={{background:"white",borderRadius:16,padding:"20px",textAlign:"center",color:"#94a3b8",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
                        <div style={{fontSize:13,fontWeight:600}}>처리된 예약이 없어요</div>
                      </div>
                    : approvedR.concat(rejectedR).slice(0,10).map(function(r){
                        return (
                          <div key={r.id} style={{background:"white",borderRadius:16,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 8px rgba(0,0,0,.05)",opacity:0.85}}>
                            <div style={{width:40,height:40,borderRadius:12,background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{r.icon}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontWeight:700,fontSize:13}}>{r.facility_name}</div>
                              <div style={{fontSize:11,color:"#94a3b8"}}>{r.date} · {r.teacher_name}</div>
                            </div>
                            <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                              <span style={{background:r.status==="승인"?"#dcfce7":"#fee2e2",color:r.status==="승인"?"#16a34a":"#ef4444",padding:"4px 10px",borderRadius:99,fontSize:11,fontWeight:800}}>{r.status}</span>
                              <button onClick={function(){ approveRes(r.id,"대기"); }} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"4px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>되돌리기</button>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              );
            })()}

            {/* 구분선 */}
            <div style={{height:1,background:"#e2e8f0",margin:"24px 0"}}></div>

            {/* 시설·교구 관리 */}
            <div style={{background:"linear-gradient(135deg,#4338ca,#6366f1)",borderRadius:18,padding:"16px 18px",marginBottom:22,display:"flex",gap:12,alignItems:"center"}}>
              <div style={{fontSize:26}}>[관리]</div>
              <div>
                <div style={{color:"white",fontWeight:900,fontSize:15}}>시설·교구 관리</div>
                <div style={{color:"rgba(255,255,255,.65)",fontSize:12,marginTop:2}}>Supabase DB에 실시간 저장됩니다</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <h2 style={{fontSize:15,fontWeight:800,margin:0}}>[학교] 특별실 관리</h2>
              <button onClick={function(){ openReg("facility"); }} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white",border:"none",borderRadius:12,padding:"8px 16px",fontSize:12,fontWeight:800,cursor:"pointer"}}>+ 새 시설</button>
            </div>
            {facList.map(function(f){
              return <div key={f.id} style={{background:"white",borderRadius:16,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 8px rgba(0,0,0,.06)",borderLeft:"4px solid "+f.color}}>
                <div style={{width:42,height:42,borderRadius:13,background:f.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{f.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:14}}>{f.name}</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{f.floor} · {f.capacity}명</div>
                </div>
                <div style={{display:"flex",gap:7,flexShrink:0}}>
                  <button onClick={function(){ openReg("facility",f); }} style={{background:"#ede9fe",color:"#6366f1",border:"none",borderRadius:9,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>수정</button>
                  <button onClick={function(){ setDelConfirm({type:"facility",item:f}); }} style={{background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:9,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>삭제</button>
                </div>
              </div>;
            })}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"24px 0 12px"}}>
              <h2 style={{fontSize:15,fontWeight:800,margin:0}}>[교구] 교구·기기 관리</h2>
              <button onClick={function(){ openReg("item"); }} style={{background:"linear-gradient(135deg,#10b981,#059669)",color:"white",border:"none",borderRadius:12,padding:"8px 16px",fontSize:12,fontWeight:800,cursor:"pointer"}}>+ 새 교구</button>
            </div>
            {itemList.map(function(item){
              return <div key={item.id} style={{background:"white",borderRadius:16,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 8px rgba(0,0,0,.06)",borderLeft:"4px solid "+item.color}}>
                <div style={{width:42,height:42,borderRadius:13,background:item.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{item.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:14}}>{item.name}</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{item.category} · 잔여 {item.stock}개</div>
                </div>
                <div style={{display:"flex",gap:7,flexShrink:0}}>
                  <button onClick={function(){ openReg("item",item); }} style={{background:"#ede9fe",color:"#6366f1",border:"none",borderRadius:9,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>수정</button>
                  <button onClick={function(){ setDelConfirm({type:"item",item:item}); }} style={{background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:9,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>삭제</button>
                </div>
              </div>;
            })}

            {/* ─ 공지사항 관리 ─ */}
            <div style={{height:1,background:"#e2e8f0",margin:"24px 0"}}></div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <h2 style={{fontSize:15,fontWeight:800,margin:0}}>[공지] 공지사항 관리</h2>
              <button onClick={function(){ setNoticeModal({mode:"add",data:{title:"공지",text:"",type:"info",icon:"[공지]",date:fmtDate(today,0)}}); }}
                style={{background:"linear-gradient(135deg,#0ea5e9,#0284c7)",color:"white",border:"none",borderRadius:12,padding:"8px 16px",fontSize:12,fontWeight:800,cursor:"pointer"}}>+ 새 공지</button>
            </div>
            {notices.length===0
              ? <div style={{background:"white",borderRadius:14,padding:"20px",textAlign:"center",color:"#94a3b8",boxShadow:"0 2px 8px rgba(0,0,0,.05)",fontSize:13}}>등록된 공지사항이 없어요</div>
              : notices.map(function(n){
                var typeBg={urgent:"#fee2e2",info:"#ede9fe",new:"#dcfce7"};
                var typeColor={urgent:"#ef4444",info:"#6366f1",new:"#16a34a"};
                return (
                  <div key={n.id} style={{background:"white",borderRadius:16,padding:"14px 16px",marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                      <span style={{fontSize:18,flexShrink:0}}>{n.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                          <span style={{background:typeBg[n.type]||"#f1f5f9",color:typeColor[n.type]||"#64748b",fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:99}}>{n.title}</span>
                          <span style={{color:"#94a3b8",fontSize:11}}>{n.date}</span>
                        </div>
                        <p style={{fontSize:12,color:"#374151",margin:0,lineHeight:1.5}}>{n.text}</p>
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        <button onClick={function(){ setNoticeModal({mode:"edit",data:Object.assign({},n)}); }}
                          style={{background:"#ede9fe",color:"#6366f1",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>수정</button>
                        <button onClick={function(){
                          setNotices(function(v){ return v.filter(function(x){ return x.id!==n.id; }); });
                          notify("공지사항이 삭제됐어요");
                        }} style={{background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>삭제</button>
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

      {/* 예약 모달 */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,15,35,.55)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={function(e){ if(e.target===e.currentTarget){setModal(null);setStep(0);setShowMoreDates(false);setCalMonth(0);} }}>
          <div style={{background:"white",borderRadius:"26px 26px 0 0",padding:"28px 24px 44px",width:"100%",maxWidth:430,animation:"slideUp .32s ease",maxHeight:"88vh",overflowY:"auto"}}>
            <div style={{width:42,height:5,background:"#e2e8f0",borderRadius:99,margin:"0 auto 26px"}}/>
            {step===0&&(
              <div>
                <div style={{display:"flex",gap:15,alignItems:"center",marginBottom:26}}>
                  <div style={{width:58,height:58,borderRadius:18,background:modal.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{modal.icon}</div>
                  <div>
                    <h3 style={{fontSize:20,fontWeight:900,margin:"0 0 4px"}}>{modal.name}</h3>
                    <p style={{color:"#64748b",margin:0,fontSize:13}}>{modal.floor||modal.category}{modal.capacity?" · "+modal.capacity+"명":modal.stock?" · 잔여 "+modal.stock+"개":""}</p>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <p style={{fontSize:13,fontWeight:700,margin:0,color:"#374151"}}> 날짜 선택</p>
                  {showMoreDates && (
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <button onClick={function(){ setCalMonth(function(m){ return m-1; }); }}
                        style={{background:"none",border:"1px solid #e8ecf0",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:14,color:"#6366f1",fontWeight:700}}>‹</button>
                      <span style={{fontSize:12,fontWeight:700,color:"#374151",whiteSpace:"nowrap"}}>
                        {(function(){ var d=new Date(today); d.setMonth(d.getMonth()+calMonth); return d.getFullYear()+"년 "+(d.getMonth()+1)+"월"; })()}
                      </span>
                      <button onClick={function(){ setCalMonth(function(m){ return m+1; }); }}
                        style={{background:"none",border:"1px solid #e8ecf0",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:14,color:"#6366f1",fontWeight:700}}>›</button>
                    </div>
                  )}
                </div>

                {/* 기본: 이번 주 한 줄 (월~일) */}
                {!showMoreDates && (function(){
                  var monday = new Date(today);
                  var dow = today.getDay();
                  var diff = dow===0 ? -6 : 1-dow;
                  monday.setDate(today.getDate()+diff);
                  var days = Array.from({length:7}, function(_,i){
                    var d = new Date(monday); d.setDate(monday.getDate()+i);
                    return d;
                  });
                  return (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
                      {["월","화","수","목","금","토","일"].map(function(d,i){
                        return <div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:i>=5?"#ef4444":"#94a3b8",marginBottom:4,paddingBottom:4}}>{d}</div>;
                      })}
                      {days.map(function(d,i){
                        var dStr=(d.getMonth()+1)+"/"+d.getDate()+"("+DAY_KR[d.getDay()]+")";
                        var sel=book.date===dStr;
                        var isToday=d.toDateString()===today.toDateString();
                        var isPast=d<new Date(today.getFullYear(),today.getMonth(),today.getDate());
                        var isWeekend=i>=5;
                        return (
                          <button key={i} disabled={isPast} onClick={function(){ setBook(function(b){ return Object.assign({},b,{date:dStr}); }); }}
                            style={{background:sel?"linear-gradient(135deg,#6366f1,#8b5cf6)":isToday?"#ede9fe":"#f8fafc",color:sel?"white":isPast?"#d1d5db":isWeekend?"#ef4444":"#374151",border:sel?"none":isToday?"1.5px solid #6366f1":"1.5px solid #e8ecf0",borderRadius:10,padding:"8px 2px",fontSize:12,fontWeight:sel||isToday?800:600,cursor:isPast?"not-allowed":"pointer",opacity:isPast?0.4:1}}>
                            {d.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* 더보기: 달력 형식 */}
                {showMoreDates && (function(){
                  var base = new Date(today.getFullYear(), today.getMonth()+calMonth, 1);
                  var year = base.getFullYear(), month = base.getMonth();
                  var firstDay = base.getDay(); // 0=일
                  var daysInMonth = new Date(year,month+1,0).getDate();
                  // 월요일 시작: 일요일=6, 월요일=0
                  var startOffset = firstDay===0 ? 6 : firstDay-1;
                  var cells = [];
                  for(var i=0;i<startOffset;i++) cells.push(null);
                  for(var j=1;j<=daysInMonth;j++) cells.push(j);
                  while(cells.length%7!==0) cells.push(null);
                  return (
                    <div style={{marginBottom:8}}>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
                        {["월","화","수","목","금","토","일"].map(function(d,i){
                          return <div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:i>=5?"#ef4444":"#94a3b8",paddingBottom:4}}>{d}</div>;
                        })}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
                        {cells.map(function(day,idx){
                          if(!day) return <div key={idx}></div>;
                          var d = new Date(year,month,day);
                          var dStr=(d.getMonth()+1)+"/"+d.getDate()+"("+DAY_KR[d.getDay()]+")";
                          var sel=book.date===dStr;
                          var isToday=d.toDateString()===today.toDateString();
                          var isPast=d<new Date(today.getFullYear(),today.getMonth(),today.getDate());
                          var isWeekend=idx%7>=5;
                          return (
                            <button key={idx} disabled={isPast} onClick={function(){ setBook(function(b){ return Object.assign({},b,{date:dStr}); }); }}
                              style={{background:sel?"linear-gradient(135deg,#6366f1,#8b5cf6)":isToday?"#ede9fe":"#f8fafc",color:sel?"white":isPast?"#d1d5db":isWeekend?"#ef4444":"#374151",border:sel?"none":isToday?"1.5px solid #6366f1":"1.5px solid #e8ecf0",borderRadius:10,padding:"8px 2px",fontSize:12,fontWeight:sel||isToday?800:600,cursor:isPast?"not-allowed":"pointer",opacity:isPast?0.4:1,textAlign:"center"}}>
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <button onClick={function(){ setShowMoreDates(function(v){ return !v; }); if(showMoreDates) setCalMonth(0); }}
                  style={{width:"100%",background:"#f8fafc",border:"1.5px solid #e8ecf0",borderRadius:12,padding:"9px",fontSize:12,fontWeight:700,color:"#6366f1",cursor:"pointer",marginBottom:22,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {showMoreDates ? "▲ 접기" : "▼ 한 달 달력으로 보기"}
                </button>
                <p style={{fontSize:13,fontWeight:700,margin:"0 0 11px",color:"#374151"}}> 교시 선택</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:24}}>
                  {TIME_SLOTS.map(function(t){
                    var sel=book.time===t;
                    var currentDate = book.date||fmtDate(today,0);
                    var bookedRes = res.find(function(r){
                      return r.facility_name===modal.name
                        && r.date===currentDate
                        && r.time_slot===t
                        && (r.status==="대기"||r.status==="승인");
                    });
                    var isBooked = !!bookedRes;
                    var bookedLabel = isBooked ? (bookedRes.status==="승인"?"확정":"대기") : "";
                    return (
                      <button key={t}
                        onClick={function(){ if(!isBooked) setBook(function(b){ return Object.assign({},b,{time:t}); }); }}
                        disabled={isBooked}
                        style={{
                          background: isBooked?"#f1f5f9": sel?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#f8fafc",
                          color: isBooked?"#cbd5e1": sel?"white":"#374151",
                          border: isBooked?"1.5px solid #e2e8f0": sel?"none":"1.5px solid #e8ecf0",
                          borderRadius:13,padding:"11px 10px",fontSize:12,fontWeight:700,
                          cursor:isBooked?"not-allowed":"pointer",textAlign:"left",
                          position:"relative",opacity:isBooked?0.65:1,
                        }}>
                        {t}
                        {isBooked && (
                          <span style={{
                            position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",
                            fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:99,
                            background:bookedRes.status==="승인"?"#dcfce7":"#fef3c7",
                            color:bookedRes.status==="승인"?"#16a34a":"#d97706",
                          }}>{bookedLabel}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <button onClick={function(){ setStep(1); }} disabled={!book.date||!book.time} style={{width:"100%",background:(!book.date||!book.time)?"#e2e8f0":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:(!book.date||!book.time)?"#94a3b8":"white",border:"none",borderRadius:16,padding:16,fontSize:16,fontWeight:800,cursor:(!book.date||!book.time)?"not-allowed":"pointer"}}>다음 단계 →</button>
              </div>
            )}
            {step===1&&(
              <div>
                <h3 style={{fontSize:18,fontWeight:900,margin:"0 0 20px"}}> 사용 목적 입력</h3>
                <div style={{background:"#f8fafc",border:"1.5px solid #e8ecf0",borderRadius:16,padding:"15px 17px",marginBottom:16}}>
                  {[["장소",modal.name],["날짜",book.date],["시간",book.time]].map(function(kv){ return <div key={kv[0]} style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:13}}><span style={{color:"#64748b"}}>{kv[0]}</span><span style={{fontWeight:800}}>{kv[1]}</span></div>; })}
                </div>
                <textarea value={book.purpose} onChange={function(e){ setBook(function(b){ return Object.assign({},b,{purpose:e.target.value}); }); }} placeholder="사용 목적을 입력하세요 (예: 5학년 과학 실험)"
                  style={{width:"100%",background:"#f8fafc",border:"1.5px solid #e8ecf0",borderRadius:16,padding:14,fontSize:14,color:"#1e293b",resize:"none",height:88,fontFamily:"sans-serif",marginBottom:18,boxSizing:"border-box"}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
                  <button onClick={function(){ setStep(0); }} style={{background:"#f1f5f9",color:"#374151",border:"none",borderRadius:15,padding:15,fontSize:15,fontWeight:700,cursor:"pointer"}}>← 이전</button>
                  <button onClick={function(){ confirmBook(modal); }} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white",border:"none",borderRadius:15,padding:15,fontSize:15,fontWeight:800,cursor:"pointer"}}>예약 신청 ✓</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR 모달 */}
      {qr&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,15,35,.6)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={function(){ setQr(null); }}>
          <div style={{background:"white",borderRadius:26,padding:"28px 24px",width:"100%",maxWidth:340,animation:"popIn .3s ease",textAlign:"center",maxHeight:"90vh",overflowY:"auto"}} onClick={function(e){ e.stopPropagation(); }}>
            <div style={{width:56,height:56,borderRadius:18,background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 10px"}}>{qr.icon}</div>
            <h3 style={{fontSize:19,fontWeight:900,margin:"0 0 4px"}}>{qr.facility_name}</h3>
            <p style={{color:"#64748b",fontSize:13,margin:"0 0 2px"}}>{qr.date} · {qr.time_slot}</p>
            <p style={{color:"#94a3b8",fontSize:12,margin:"0 0 4px"}}>{qr.teacher_name} 선생님</p>
            <p style={{color:"#94a3b8",fontSize:11,margin:"0 0 18px",background:"#f8fafc",borderRadius:8,padding:"4px 10px",display:"inline-block"}}>{qr.purpose}</p>

            {qr.status==="승인" ? (
              <div>
                <div style={{background:"#dcfce7",border:"1px solid #86efac",borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <span style={{color:"#16a34a",fontWeight:800,fontSize:13}}>[완료] 승인 완료 · 입실 QR코드</span>
                </div>
                <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
                  <QRCode
                    text={"https://school-reservation-pi.vercel.app/checkin?id="+qr.id+"&facility="+encodeURIComponent(qr.facility_name)+"&date="+encodeURIComponent(qr.date)+"&time="+encodeURIComponent(qr.time_slot)+"&teacher="+encodeURIComponent(qr.teacher_name)}
                    size={190}
                  />
                </div>
                <p style={{color:"#64748b",fontSize:11,margin:"0 0 6px",lineHeight:1.6}}>시설 입구에서 QR코드를 스캔하면<br/>자동으로 입실 처리됩니다</p>
                <div style={{background:"#f8fafc",borderRadius:10,padding:"8px 12px",marginBottom:16,fontSize:10,color:"#94a3b8",wordBreak:"break-all",textAlign:"left"}}>
                  <span style={{fontWeight:700,color:"#64748b"}}>예약 ID: </span>{qr.id}
                </div>
              </div>
            ) : (
              <div>
                <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <span style={{color:"#d97706",fontWeight:800,fontSize:13}}>[대기] 관리자 승인 대기 중</span>
                </div>
                <div style={{background:"#f8fafc",borderRadius:16,padding:"32px 20px",marginBottom:16,display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                  <div style={{fontSize:36}}>[잠금]</div>
                  <p style={{fontSize:12,color:"#94a3b8",margin:0,lineHeight:1.7}}>승인 후 QR코드가 생성됩니다<br/>관리자의 승인을 기다려주세요</p>
                </div>
              </div>
            )}
            <button onClick={function(){ setQr(null); }} style={{width:"100%",background:"#f1f5f9",border:"none",borderRadius:15,padding:14,fontSize:15,fontWeight:700,cursor:"pointer",color:"#374151"}}>닫기</button>
          </div>
        </div>
      )}

      {/* 등록/수정 모달 */}
      {regModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,15,35,.6)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={function(e){ if(e.target===e.currentTarget)setRegModal(null); }}>
          <div style={{background:"white",borderRadius:"26px 26px 0 0",padding:"28px 24px 44px",width:"100%",maxWidth:430,animation:"slideUp .32s ease",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{width:42,height:5,background:"#e2e8f0",borderRadius:99,margin:"0 auto 22px"}}/>
            <h3 style={{fontSize:18,fontWeight:900,margin:"0 0 22px"}}>{regModal.editing?" 정보 수정":"+ 새로 등록"} · {regModal.type==="facility"?"특별실":"교구·기기"}</h3>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:6}}>이름 *</label>
              <input value={regForm.name||""} onChange={setRF("name")} placeholder={regModal.type==="facility"?"예: 과학실 2":"예: 태블릿 세트 B"} style={{width:"100%",boxSizing:"border-box",background:"#f8fafc",border:"1.5px solid #e8ecf0",borderRadius:12,padding:"12px 14px",fontSize:14,fontFamily:"sans-serif",color:"#1e293b"}}/>
            </div>
            {regModal.type==="facility"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:6}}>위치 *</label>
                  <input value={regForm.floor||""} onChange={setRF("floor")} placeholder="예: 3층" style={{width:"100%",boxSizing:"border-box",background:"#f8fafc",border:"1.5px solid #e8ecf0",borderRadius:12,padding:"12px 14px",fontSize:14,fontFamily:"sans-serif",color:"#1e293b"}}/>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:6}}>수용 인원 *</label>
                  <input type="number" value={regForm.capacity||""} onChange={setRF("capacity")} placeholder="예: 30" style={{width:"100%",boxSizing:"border-box",background:"#f8fafc",border:"1.5px solid #e8ecf0",borderRadius:12,padding:"12px 14px",fontSize:14,fontFamily:"sans-serif",color:"#1e293b"}}/>
                </div>
              </div>
            )}
            {regModal.type==="item"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:6}}>재고 수량 *</label>
                  <input type="number" value={regForm.stock||""} onChange={setRF("stock")} placeholder="예: 5" style={{width:"100%",boxSizing:"border-box",background:"#f8fafc",border:"1.5px solid #e8ecf0",borderRadius:12,padding:"12px 14px",fontSize:14,fontFamily:"sans-serif",color:"#1e293b"}}/>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:6}}>카테고리</label>
                  <div style={{display:"flex",gap:6,paddingTop:4}}>
                    {["교구","공용기기"].map(function(c){ return <button key={c} onClick={function(){ setRegForm(function(v){ return Object.assign({},v,{category:c}); }); }} style={{flex:1,background:regForm.category===c?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#f1f5f9",color:regForm.category===c?"white":"#64748b",border:"none",borderRadius:10,padding:"10px 4px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{c}</button>; })}
                  </div>
                </div>
              </div>
            )}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:8}}>아이콘</label>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                {(regModal.type==="facility"?ICONS_FAC:ICONS_ITEM).map(function(ic){ return <button key={ic} onClick={function(){ setRegForm(function(v){ return Object.assign({},v,{icon:ic}); }); }} style={{width:42,height:42,borderRadius:12,border:regForm.icon===ic?"2.5px solid #6366f1":"2px solid #e8ecf0",background:regForm.icon===ic?"#ede9fe":"#f8fafc",fontSize:20,cursor:"pointer"}}>{ic}</button>; })}
              </div>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:8}}>색상 테마</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {COLORS_LIST.map(function(c){ return <button key={c} onClick={function(){ setRegForm(function(v){ return Object.assign({},v,{color:c}); }); }} style={{width:30,height:30,borderRadius:99,background:c,border:regForm.color===c?"3px solid #1e293b":"3px solid transparent",cursor:"pointer"}}></button>; })}
              </div>
            </div>
            <div style={{background:"#f8fafc",border:"1.5px solid #e8ecf0",borderRadius:14,padding:"14px 16px",marginBottom:22,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:46,height:46,borderRadius:14,background:(regForm.color||"#6366f1")+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{regForm.icon||"?"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:14,color:"#1e293b"}}>{regForm.name||"이름 입력 전"}</div>
                <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{regModal.type==="facility"?(regForm.floor||"위치")+" · "+(regForm.capacity||0)+"명":(regForm.category||"카테고리")+" · 잔여 "+(regForm.stock||0)+"개"}</div>
              </div>
              <span style={{fontSize:10,color:"#94a3b8",fontWeight:600}}>미리보기</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
              <button onClick={function(){ setRegModal(null); }} style={{background:"#f1f5f9",color:"#374151",border:"none",borderRadius:15,padding:15,fontSize:15,fontWeight:700,cursor:"pointer"}}>취소</button>
              <button onClick={saveReg} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white",border:"none",borderRadius:15,padding:15,fontSize:15,fontWeight:800,cursor:"pointer"}}>{regModal.editing?"저장하기 ✓":"등록하기 ✓"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {delConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,15,35,.6)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={function(){ setDelConfirm(null); }}>
          <div style={{background:"white",borderRadius:24,padding:"32px 26px",width:"100%",maxWidth:320,animation:"popIn .28s ease",textAlign:"center"}} onClick={function(e){ e.stopPropagation(); }}>
            <div style={{fontSize:44,marginBottom:12}}>[삭제]</div>
            <h3 style={{fontSize:18,fontWeight:900,margin:"0 0 10px"}}>정말 삭제할까요?</h3>
            <p style={{color:"#64748b",fontSize:14,margin:"0 0 4px"}}><strong>{delConfirm.item.name}</strong>을 삭제합니다.</p>
            <p style={{color:"#94a3b8",fontSize:12,margin:"0 0 24px"}}>삭제하면 복구할 수 없어요</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button onClick={function(){ setDelConfirm(null); }} style={{background:"#f1f5f9",color:"#374151",border:"none",borderRadius:14,padding:14,fontSize:14,fontWeight:700,cursor:"pointer"}}>취소</button>
              <button onClick={function(){ deleteItem(delConfirm.type,delConfirm.item.id); }} style={{background:"linear-gradient(135deg,#ef4444,#dc2626)",color:"white",border:"none",borderRadius:14,padding:14,fontSize:14,fontWeight:800,cursor:"pointer"}}>삭제하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 공지 등록/수정 모달 */}
      {noticeModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,15,35,.6)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={function(e){ if(e.target===e.currentTarget) setNoticeModal(null); }}>
          <div style={{background:"white",borderRadius:"26px 26px 0 0",padding:"28px 24px 44px",width:"100%",maxWidth:430,animation:"slideUp .32s ease",maxHeight:"88vh",overflowY:"auto"}}
            onClick={function(e){ e.stopPropagation(); }}>
            <div style={{width:42,height:5,background:"#e2e8f0",borderRadius:99,margin:"0 auto 22px"}}/>
            <h3 style={{fontSize:18,fontWeight:900,margin:"0 0 20px"}}>{noticeModal.mode==="add"?"[공지] 새 공지 등록":" 공지 수정"}</h3>

            {/* 유형 선택 */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:8}}>유형</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[["urgent","[긴급]","긴급"],["info","[공지]","공지"],["new","[안내]","안내"]].map(function(item){
                  var sel=noticeModal.data.type===item[0];
                  return <button key={item[0]} onClick={function(){ setNoticeModal(function(v){ return Object.assign({},v,{data:Object.assign({},v.data,{type:item[0],icon:item[1],title:item[2]})}); }); }}
                    style={{background:sel?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#f8fafc",color:sel?"white":"#374151",border:sel?"none":"1.5px solid #e8ecf0",borderRadius:12,padding:"10px 6px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                    {item[1]} {item[2]}
                  </button>;
                })}
              </div>
            </div>

            {/* 제목 */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:6}}>제목 태그</label>
              <input value={noticeModal.data.title||""} onChange={function(e){ setNoticeModal(function(v){ return Object.assign({},v,{data:Object.assign({},v.data,{title:e.target.value})}); }); }}
                placeholder="예: 긴급, 공지, 안내, 점검"
                style={{width:"100%",boxSizing:"border-box",background:"#f8fafc",border:"1.5px solid #e8ecf0",borderRadius:12,padding:"12px 14px",fontSize:14,fontFamily:"sans-serif",color:"#1e293b"}}/>
            </div>

            {/* 내용 */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:6}}>공지 내용 *</label>
              <textarea value={noticeModal.data.text||""} onChange={function(e){ setNoticeModal(function(v){ return Object.assign({},v,{data:Object.assign({},v.data,{text:e.target.value})}); }); }}
                placeholder="공지 내용을 입력하세요"
                style={{width:"100%",boxSizing:"border-box",background:"#f8fafc",border:"1.5px solid #e8ecf0",borderRadius:12,padding:"12px 14px",fontSize:14,fontFamily:"sans-serif",color:"#1e293b",resize:"none",height:80}}/>
            </div>

            {/* 날짜 */}
            <div style={{marginBottom:22}}>
              <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:6}}>날짜 표시</label>
              <input value={noticeModal.data.date||""} onChange={function(e){ setNoticeModal(function(v){ return Object.assign({},v,{data:Object.assign({},v.data,{date:e.target.value})}); }); }}
                placeholder="예: 오늘, 5/12, 상시"
                style={{width:"100%",boxSizing:"border-box",background:"#f8fafc",border:"1.5px solid #e8ecf0",borderRadius:12,padding:"12px 14px",fontSize:14,fontFamily:"sans-serif",color:"#1e293b"}}/>
            </div>

            {/* 미리보기 */}
            <div style={{background:"#f8fafc",border:"1.5px solid #e8ecf0",borderRadius:14,padding:"12px 16px",marginBottom:20,display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:18,flexShrink:0}}>{noticeModal.data.icon||"[공지]"}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                  <span style={{background:BADGE_CLR[noticeModal.data.type]||"#60a5fa",color:"white",fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:99}}>{noticeModal.data.title||"공지"}</span>
                  <span style={{color:"#94a3b8",fontSize:11}}>{noticeModal.data.date||""}</span>
                </div>
                <p style={{fontSize:12,color:"#374151",margin:0,lineHeight:1.5}}>{noticeModal.data.text||"내용을 입력해주세요"}</p>
              </div>
              <span style={{fontSize:10,color:"#94a3b8",flexShrink:0}}>미리보기</span>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
              <button onClick={function(){ setNoticeModal(null); }} style={{background:"#f1f5f9",color:"#374151",border:"none",borderRadius:15,padding:15,fontSize:15,fontWeight:700,cursor:"pointer"}}>취소</button>
              <button onClick={function(){
                if(!noticeModal.data.text||!noticeModal.data.text.trim()){ notify("내용을 입력해주세요","err"); return; }
                if(noticeModal.mode==="add"){
                  var newN = Object.assign({id:Date.now()},noticeModal.data);
                  setNotices(function(v){ return [newN].concat(v); });
                  notify("공지사항이 등록됐어요!");
                } else {
                  setNotices(function(v){ return v.map(function(x){ return x.id===noticeModal.data.id ? Object.assign({},x,noticeModal.data) : x; }); });
                  notify("공지사항이 수정됐어요!");
                }
                setNoticeModal(null);
              }} style={{background:"linear-gradient(135deg,#0ea5e9,#0284c7)",color:"white",border:"none",borderRadius:15,padding:15,fontSize:15,fontWeight:800,cursor:"pointer"}}>
                {noticeModal.mode==="add"?"등록하기 ✓":"저장하기 ✓"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
    </div>
}
