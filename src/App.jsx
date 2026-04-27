import { useState, useEffect } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  🔑 여기에 Supabase 정보를 입력하세요!
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var SUPABASE_URL = "https://wfbiovaieuoyrakbvcpq.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmlvdmFpZXVveXJha2J2Y3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMTc5MTQsImV4cCI6MjA5MjY5MzkxNH0.7aFz4W-Xs13lu2QF7MNSkCYdSWLDjlX38CGPCZxEXEE";

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
var TIME_SLOTS = ["1교시(09:00)","2교시(10:00)","3교시(11:00)","4교시(12:00)","5교시(13:50)","6교시(14:50)"];
var today      = new Date();
var COLORS_LIST= ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4","#f97316","#6366f1","#14b8a6"];
var ICONS_FAC  = ["🔬","💻","📚","🎵","⚽","🎨","🏃","🎭","🔭","📐"];
var ICONS_ITEM = ["📱","🎥","🥽","🤖","🚁","🎮","📷","🔋","🎯","🖊"];
var NOTICES    = [
  { id:1, type:"urgent", icon:"🚨", title:"긴급", text:"오늘 오후 과학실 누수로 3~6교시 사용 불가합니다.", date:"오늘" },
  { id:2, type:"info",   icon:"📢", title:"공지", text:"5/15(목) 전 시설 예약이 제한됩니다.", date:"5/12" },
  { id:3, type:"new",    icon:"✨", title:"안내", text:"태블릿 세트 10대 신규 입고되었습니다.", date:"5/10" },
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

// ── QR 코드 ──────────────────────────────
function QRCode(props) {
  var text = props.text, size = props.size||136;
  var cells=21, cell=size/cells;
  var seed=0; for(var ci=0;ci<text.length;ci++) seed+=text.charCodeAt(ci);
  function rng(i){ return ((seed*9301+i*49297)%233280)/233280; }
  var fixed={};
  [[0,0],[0,14],[14,0]].forEach(function(rc){
    for(var dr=0;dr<7;dr++) for(var dc=0;dc<7;dc++) fixed[(rc[0]+dr)+","+(rc[1]+dc)]=true;
  });
  var rects=[];
  for(var r=0;r<cells;r++) for(var c=0;c<cells;c++){
    var key=r+","+c, dark;
    if(fixed[key]){
      var base=[[0,0],[0,14],[14,0]].find(function(b){ return r>=b[0]&&r<b[0]+7&&c>=b[1]&&c<b[1]+7; })||[0,0];
      var lr=r-base[0],lc=c-base[1];
      dark=lr===0||lr===6||lc===0||lc===6||(lr>=2&&lr<=4&&lc>=2&&lc<=4);
    } else { dark=rng(r*cells+c)>0.5; }
    if(dark) rects.push(<rect key={key} x={c*cell} y={r*cell} width={cell} height={cell} fill="#1e1b4b"/>);
  }
  return (
    <div style={{background:"white",borderRadius:16,padding:10,display:"inline-block",boxShadow:"0 4px 20px rgba(0,0,0,.12)"}}>
      <svg width={size} height={size}>{rects}</svg>
    </div>
  );
}

// ── 공지 배너 ────────────────────────────
function NoticeBanner() {
  var [open,setOpen]=useState(false), [sel,setSel]=useState(null);
  var urgent=NOTICES.filter(function(n){ return n.type==="urgent"; }).length;
  return (
    <div style={{width:"100%",maxWidth:380,marginBottom:14}}>
      <div onClick={function(){ setOpen(function(v){ return !v; }); }}
        style={{background:"rgba(255,255,255,.11)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,.22)",borderRadius:open?"16px 16px 0 0":"16px",padding:"11px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",userSelect:"none"}}>
        <div style={{position:"relative",flexShrink:0}}>
          <div style={{width:32,height:32,borderRadius:10,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📋</div>
          {urgent>0&&<span style={{position:"absolute",top:-5,right:-5,background:"#ef4444",color:"white",fontSize:9,fontWeight:900,borderRadius:99,padding:"2px 5px",animation:"pulse 2s infinite"}}>{urgent}</span>}
        </div>
        <div style={{flex:1,overflow:"hidden",whiteSpace:"nowrap"}}>
          <span style={{display:"inline-block",animation:"marquee 16s linear infinite",color:"rgba(255,255,255,.88)",fontSize:12,fontWeight:600}}>
            {NOTICES[0].icon} [{NOTICES[0].title}] {NOTICES[0].text}
          </span>
        </div>
        <span style={{color:"rgba(255,255,255,.5)",fontSize:11,transition:"transform .25s",transform:open?"rotate(180deg)":"none",display:"inline-block"}}>▼</span>
      </div>
      {open&&(
        <div style={{background:"rgba(10,20,50,.92)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,.1)",borderTop:"none",borderRadius:"0 0 16px 16px",overflow:"hidden"}}>
          {NOTICES.map(function(n,i){
            return (
              <div key={n.id} onClick={function(){ setSel(n); }}
                style={{padding:"12px 16px",borderTop:i?"1px solid rgba(255,255,255,.07)":"none",display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",background:n.type==="urgent"?"rgba(239,68,68,.07)":"transparent"}}>
                <span style={{fontSize:17,flexShrink:0}}>{n.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span style={{background:BADGE_CLR[n.type],color:"white",fontSize:9,fontWeight:900,padding:"2px 7px",borderRadius:99}}>{n.title}</span>
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
              <span style={{background:BADGE_CLR[sel.type],color:"white",fontSize:11,fontWeight:900,padding:"3px 10px",borderRadius:99}}>{sel.title}</span>
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
  var [form,setForm]=useState({name:"",id:"",pw:"",pwCheck:"",subject:"",role:"teacher"});
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
      avatar:form.role==="admin"?"🧑":"👩"
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
      <div style={{position:"fixed",top:"10%",left:"15%",width:260,height:260,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,.18),transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:"15%",right:"10%",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,.15),transparent 70%)",pointerEvents:"none"}}/>

      <div style={{textAlign:"center",marginBottom:22,animation:"fadeUp .5s ease"}}>
        <div style={{width:70,height:70,borderRadius:22,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 14px",boxShadow:"0 8px 32px rgba(99,102,241,.4)"}}>🏫</div>
        <h1 style={{color:"white",fontSize:22,fontWeight:900,margin:"0 0 5px"}}>스마트 예약 시스템</h1>
        <p style={{color:"rgba(255,255,255,.42)",fontSize:12,margin:0}}>소정초등학교 · 시설·교구 통합 예약</p>
      </div>

      <NoticeBanner />

      <div style={{width:"100%",maxWidth:380,background:"rgba(255,255,255,.07)",borderRadius:18,padding:5,marginBottom:16,display:"flex",border:"1px solid rgba(255,255,255,.1)"}}>
        {[["login","🔐 로그인"],["signup","✏ 회원가입"]].map(function(item){
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
              <button onClick={function(){setShowPw(function(v){return !v;});}} style={{position:"absolute",right:14,bottom:14,background:"none",border:"none",color:"rgba(255,255,255,.4)",cursor:"pointer",fontSize:17,padding:0}}>{showPw?"🙈":"👁"}</button>
            </div>
            {err&&<div style={{background:"rgba(239,68,68,.14)",border:"1px solid rgba(239,68,68,.32)",borderRadius:11,padding:"10px 14px",marginBottom:14,color:"#fca5a5",fontSize:12,fontWeight:600,textAlign:"center"}}>⚠ {err}</div>}
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
              {[{id:"teacher1",pw:"1234",name:"김서블",avatar:"👩",role:"teacher"},{id:"teacher2",pw:"1234",name:"이민준",avatar:"👨",role:"teacher"},{id:"admin",pw:"0000",name:"홍관리",avatar:"🧑",role:"admin"}].map(function(a){
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
              <div style={{width:72,height:72,borderRadius:24,background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 16px"}}>🎉</div>
              <h3 style={{color:"white",fontSize:19,fontWeight:900,margin:"0 0 8px"}}>가입 완료!</h3>
              <p style={{color:"rgba(255,255,255,.5)",fontSize:13,margin:0}}>잠시 후 로그인 화면으로 이동해요</p>
            </div>
          ):(
            <div>
              {[{l:"이름",k:"name",ph:"홍길동"},{l:"아이디(4자 이상)",k:"id",ph:"사용할 아이디"},{l:"담당 과목",k:"subject",ph:"예: 정보AI, 과학"}].map(function(field){
                return <div key={field.k} style={{marginBottom:14}}>
                  <label style={{color:"rgba(255,255,255,.65)",fontSize:11,fontWeight:700,display:"block",marginBottom:6}}>{field.l}</label>
                  <input value={form[field.k]} onChange={setF(field.k)} placeholder={field.ph} style={inputStyle}/>
                </div>;
              })}
              <div style={{marginBottom:14,position:"relative"}}>
                <label style={{color:"rgba(255,255,255,.65)",fontSize:11,fontWeight:700,display:"block",marginBottom:6}}>비밀번호(4자 이상)</label>
                <input type={showSpw?"text":"password"} value={form.pw} onChange={setF("pw")} placeholder="비밀번호" style={Object.assign({},inputStyle,{paddingRight:46})}/>
                <button onClick={function(){setShowSpw(function(v){return !v;});}} style={{position:"absolute",right:14,bottom:14,background:"none",border:"none",color:"rgba(255,255,255,.4)",cursor:"pointer",fontSize:17,padding:0}}>{showSpw?"🙈":"👁"}</button>
              </div>
              <div style={{marginBottom:14,position:"relative"}}>
                <label style={{color:"rgba(255,255,255,.65)",fontSize:11,fontWeight:700,display:"block",marginBottom:6}}>비밀번호 확인</label>
                <input type="password" value={form.pwCheck} onChange={setF("pwCheck")} placeholder="비밀번호 재입력" style={Object.assign({},inputStyle,{paddingRight:46})}/>
                {form.pwCheck&&<span style={{position:"absolute",right:14,bottom:14,fontSize:16}}>{form.pw===form.pwCheck?"✅":"❌"}</span>}
              </div>
              <div style={{marginBottom:18}}>
                <label style={{color:"rgba(255,255,255,.65)",fontSize:11,fontWeight:700,display:"block",marginBottom:8}}>역할</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  {[["teacher","선생님"],["admin","관리자"]].map(function(item){
                    return <button key={item[0]} onClick={function(){setForm(function(v){return Object.assign({},v,{role:item[0]});});}} style={{background:form.role===item[0]?"rgba(99,102,241,.35)":"rgba(255,255,255,.07)",border:form.role===item[0]?"1.5px solid #818cf8":"1.5px solid rgba(255,255,255,.12)",borderRadius:13,padding:"12px 8px",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>{item[1]}</button>;
                  })}
                </div>
              </div>
              {signErr&&<div style={{background:"rgba(239,68,68,.14)",border:"1px solid rgba(239,68,68,.32)",borderRadius:11,padding:"10px 14px",marginBottom:14,color:"#fca5a5",fontSize:12,fontWeight:600,textAlign:"center"}}>⚠ {signErr}</div>}
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

// ── 메인 앱 ──────────────────────────────
export default function App() {
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

  // ── DB에서 데이터 불러오기 ──
  function loadAll(){
    setLoadingData(true);
    Promise.all([
      sb.get("facilities","select=*&order=id"),
      sb.get("items","select=*&order=id"),
      sb.get("reservations","select=*&order=created_at.desc"),
    ]).then(function(results){
      setFacList(results[0]||[]);
      setItemList(results[1]||[]);
      setRes(results[2]||[]);
      setLoadingData(false);
    }).catch(function(e){
      console.error("데이터 로딩 오류:", e);
      setLoadingData(false);
    });
  }

  useEffect(function(){
    if(user) loadAll();
  }, [user]);

  if(!user) return <LoginScreen
    onLogin={function(u){ setUser(u); }}
    onRegister={function(a){ console.log("가입됨",a); }}
  />;

  function logout(){ savedSession=null; setUser(null); setTab("home"); }
  function notify(msg,type){ setToast({msg:msg,type:type||"ok"}); setTimeout(function(){ setToast(null); },2800); }

  // ── 예약 신청 → DB 저장 ──
  function confirmBook(item){
    var data = {
      facility_name: item.name,
      icon: item.icon,
      date: book.date||fmtDate(today,0),
      time_slot: book.time||TIME_SLOTS[0],
      teacher_name: user.name,
      purpose: book.purpose||"수업 활용",
      status: "대기",
    };
    sb.post("reservations", data)
      .then(function(rows){
        var saved = (rows&&rows[0]) ? rows[0] : Object.assign({id:Date.now()},data);
        setRes(function(v){ return [saved].concat(v); });
        setModal(null); setStep(0); setBook({date:"",time:"",purpose:""});
        notify(item.name+" 예약 신청 완료! 🎉");
      })
      .catch(function(e){ notify("예약 오류: "+e.message,"err"); });
  }

  // ── 관리: 시설 등록/수정 ──
  function openReg(type, editing){
    editing = editing||null;
    var def = type==="facility"
      ? {name:"",icon:"🔬",floor:"",capacity:"",color:"#3b82f6",category:"특별실"}
      : {name:"",icon:"📱",stock:"",color:"#06b6d4",category:"교구"};
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
          .then(function(){ setFacList(function(v){ return v.map(function(f){ return f.id===editing.id?Object.assign({},f,fData):f; }); }); notify("수정됐어요 ✏"); setRegModal(null); })
          .catch(function(e){ notify("오류: "+e.message,"err"); });
      } else {
        sb.post("facilities",fData)
          .then(function(rows){ var r=(rows&&rows[0])||Object.assign({id:Date.now()},fData); setFacList(function(v){ return v.concat([r]); }); notify(fData.name+" 등록 완료! 🏫"); setRegModal(null); })
          .catch(function(e){ notify("오류: "+e.message,"err"); });
      }
    } else {
      if(!regForm.stock) return notify("재고 수량을 입력하세요","err");
      var iData = {name:regForm.name,icon:regForm.icon,stock:Number(regForm.stock),color:regForm.color,category:regForm.category||"교구"};
      if(editing){
        sb.patch("items","id=eq."+editing.id,iData)
          .then(function(){ setItemList(function(v){ return v.map(function(i){ return i.id===editing.id?Object.assign({},i,iData):i; }); }); notify("수정됐어요 ✏"); setRegModal(null); })
          .catch(function(e){ notify("오류: "+e.message,"err"); });
      } else {
        sb.post("items",iData)
          .then(function(rows){ var r=(rows&&rows[0])||Object.assign({id:Date.now()},iData); setItemList(function(v){ return v.concat([r]); }); notify(iData.name+" 등록 완료! 📦"); setRegModal(null); })
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

  function approveRes(id, status) {
    sb.patch("reservations","id=eq."+id,{status:status})
      .then(function(){
        setRes(function(v){ return v.map(function(r){ return r.id===id ? Object.assign({},r,{status:status}) : r; }); });
        notify(status==="승인" ? "예약이 승인됐어요!" : "예약이 거절됐어요", status==="승인"?"ok":"err");
      })
      .catch(function(e){ notify("오류: "+e.message,"err"); });
  }

  var allItems = facList.concat(itemList);
  var filtered = cat==="전체"?allItems:allItems.filter(function(i){ return i.category===cat; });
  var todayStr = fmtDate(today,0);
  var todayR   = res.filter(function(r){ return r.date===todayStr; });
  var myR      = res.filter(function(r){ return r.teacher_name===user.name; });
  var pending  = res.filter(function(r){ return r.status==="대기"; }).length;

  var TABS=[["home","🏠","홈"],["facilities","🏫","시설"],["items","📦","교구"],["mypage","📋","내 예약"]];
  if(user.role==="admin") TABS.push(["manage","⚙","관리"]);

  return (
    <div style={{fontFamily:"sans-serif",minHeight:"100vh",background:"#f5f7fa",color:"#1e293b",maxWidth:430,margin:"0 auto",position:"relative",boxShadow:"0 0 60px rgba(0,0,0,.14)"}}>
      <style>{CSS}</style>

      {toast&&<div style={{position:"fixed",top:22,left:"50%",transform:"translateX(-50%)",background:toast.type==="ok"?"linear-gradient(135deg,#10b981,#059669)":"#ef4444",color:"white",padding:"13px 26px",borderRadius:99,fontWeight:700,fontSize:13,zIndex:9999,whiteSpace:"nowrap",animation:"toastAnim .3s ease"}}>{toast.msg}</div>}

      {/* 헤더 */}
      <div style={{background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4338ca 100%)",padding:"22px 20px 36px",position:"relative",overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"relative"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{width:28,height:28,borderRadius:9,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🏫</div>
              <p style={{color:"rgba(255,255,255,.55)",fontSize:12,margin:0,fontWeight:600}}>소정초등학교</p>
            </div>
            <h1 style={{color:"white",fontSize:20,fontWeight:900,margin:"0 0 6px"}}>스마트 예약 시스템</h1>
            <p style={{color:"rgba(255,255,255,.6)",fontSize:12,margin:0}}>{today.getMonth()+1}월 {today.getDate()}일({DAY_KR[today.getDay()]}) · {user.name} {user.role==="admin"?"관리자":"선생님"}</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:7,alignItems:"flex-end"}}>
            <div onClick={function(){ setTab("mypage"); }} style={{background:"rgba(255,255,255,.13)",border:"1px solid rgba(255,255,255,.18)",borderRadius:14,padding:"9px 14px",textAlign:"center",cursor:"pointer",minWidth:56}}>
              <div style={{fontSize:20}}>{user.avatar||"👤"}</div>
              <div style={{color:"white",fontSize:10,fontWeight:700,marginTop:2}}>내 예약</div>
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
                <h2 style={{fontSize:15,fontWeight:800,margin:0}}>📆 이번 주 예약</h2>
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
                <h2 style={{fontSize:15,fontWeight:800,margin:0}}>⚡ 빠른 예약</h2>
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
                <h2 style={{fontSize:15,fontWeight:800,margin:0}}>📅 오늘의 예약 현황</h2>
                <span style={{background:"#ede9fe",color:"#6366f1",fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:99}}>{todayR.length}건</span>
              </div>
              {todayR.length===0
                ?<div style={{background:"white",borderRadius:18,padding:36,textAlign:"center",color:"#94a3b8",boxShadow:"0 2px 10px rgba(0,0,0,.06)"}}><div style={{fontSize:36,marginBottom:10}}>📭</div><div style={{fontSize:13,fontWeight:600}}>오늘 예약이 없어요</div></div>
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
            <h2 style={{fontSize:15,fontWeight:800,margin:"0 0 18px"}}>🏫 특별실 예약</h2>
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
              {["전체","특별실","교구","공용기기"].map(function(c){ return <button key={c} onClick={function(){ setCat(c); }} style={{background:cat===c?"linear-gradient(135deg,#6366f1,#8b5cf6)":"white",color:cat===c?"white":"#64748b",border:"none",borderRadius:20,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",boxShadow:cat===c?"0 4px 14px rgba(99,102,241,.38)":"0 2px 6px rgba(0,0,0,.07)",flexShrink:0}}>{c}</button>; })}
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
            <div style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:20,padding:20,marginBottom:20,display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:52,height:52,borderRadius:16,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{user.avatar||"👤"}</div>
              <div>
                <div style={{color:"white",fontWeight:900,fontSize:17}}>{user.name} {user.role==="admin"?"관리자":"선생님"}</div>
                <div style={{color:"rgba(255,255,255,.7)",fontSize:12,marginTop:3}}>{user.subject} · 예약 {myR.length}건</div>
              </div>
            </div>
            <h2 style={{fontSize:15,fontWeight:800,margin:"0 0 16px"}}>📋 내 예약 목록</h2>
            {myR.length===0
              ?<div style={{textAlign:"center",padding:"52px 0",color:"#94a3b8",background:"white",borderRadius:20,boxShadow:"0 2px 10px rgba(0,0,0,.06)"}}><div style={{fontSize:42,marginBottom:12}}>📭</div><div style={{fontSize:14,fontWeight:600}}>예약 내역이 없어요</div></div>
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
                  {r.status==="승인"&&<div style={{background:"#ede9fe",borderRadius:11,padding:"9px 13px",display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:15}}>📱</span><span style={{fontSize:12,color:"#6366f1",fontWeight:700}}>QR코드로 입실을 확인하세요</span></div>}
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
              <div style={{fontSize:26}}>📋</div>
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
                  <h2 style={{fontSize:14,fontWeight:800,margin:"0 0 12px",color:"#374151"}}>⏳ 대기 중인 예약</h2>
                  {pendingR.length===0
                    ? <div style={{background:"white",borderRadius:16,padding:"28px",textAlign:"center",color:"#94a3b8",marginBottom:24,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
                        <div style={{fontSize:32,marginBottom:8}}>✅</div>
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
                                <div style={{fontSize:12,color:"#64748b",marginTop:2,background:"#f8fafc",borderRadius:8,padding:"4px 8px",marginTop:6}}>{r.purpose}</div>
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
                  <h2 style={{fontSize:14,fontWeight:800,margin:"20px 0 12px",color:"#374151"}}>📁 최근 처리된 예약</h2>
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
              <div style={{fontSize:26}}>⚙</div>
              <div>
                <div style={{color:"white",fontWeight:900,fontSize:15}}>시설·교구 관리</div>
                <div style={{color:"rgba(255,255,255,.65)",fontSize:12,marginTop:2}}>Supabase DB에 실시간 저장됩니다</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <h2 style={{fontSize:15,fontWeight:800,margin:0}}>🏫 특별실 관리</h2>
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
              <h2 style={{fontSize:15,fontWeight:800,margin:0}}>📦 교구·기기 관리</h2>
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
          </div>
        )}
      </div>

      {/* 예약 모달 */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,15,35,.55)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={function(e){ if(e.target===e.currentTarget){setModal(null);setStep(0);} }}>
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
                <p style={{fontSize:13,fontWeight:700,margin:"0 0 11px",color:"#374151"}}>📅 날짜 선택</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:22}}>
                  {[0,1,2,3,4].map(function(off){
                    var d=fmtDate(today,off), sel=book.date===d;
                    return <button key={off} onClick={function(){ setBook(function(b){ return Object.assign({},b,{date:d}); }); }} style={{background:sel?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#f8fafc",color:sel?"white":"#374151",border:sel?"none":"1.5px solid #e8ecf0",borderRadius:14,padding:"11px 4px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                      {d.split("(")[0]}<br/><span style={{fontSize:10}}>{("("+((d.match(/\((.)\)/)||["",""])[1])+")")}</span>
                    </button>;
                  })}
                </div>
                <p style={{fontSize:13,fontWeight:700,margin:"0 0 11px",color:"#374151"}}>🕐 교시 선택</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:24}}>
                  {TIME_SLOTS.map(function(t){
                    var sel=book.time===t;
                    return <button key={t} onClick={function(){ setBook(function(b){ return Object.assign({},b,{time:t}); }); }} style={{background:sel?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#f8fafc",color:sel?"white":"#374151",border:sel?"none":"1.5px solid #e8ecf0",borderRadius:13,padding:"11px 10px",fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"left"}}>{t}</button>;
                  })}
                </div>
                <button onClick={function(){ setStep(1); }} disabled={!book.date||!book.time} style={{width:"100%",background:(!book.date||!book.time)?"#e2e8f0":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:(!book.date||!book.time)?"#94a3b8":"white",border:"none",borderRadius:16,padding:16,fontSize:16,fontWeight:800,cursor:(!book.date||!book.time)?"not-allowed":"pointer"}}>다음 단계 →</button>
              </div>
            )}
            {step===1&&(
              <div>
                <h3 style={{fontSize:18,fontWeight:900,margin:"0 0 20px"}}>📝 사용 목적 입력</h3>
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
          <div style={{background:"white",borderRadius:26,padding:"34px 28px",width:"100%",maxWidth:340,animation:"popIn .3s ease",textAlign:"center"}} onClick={function(e){ e.stopPropagation(); }}>
            <div style={{width:60,height:60,borderRadius:20,background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 10px"}}>{qr.icon}</div>
            <h3 style={{fontSize:20,fontWeight:900,margin:"0 0 4px"}}>{qr.facility_name}</h3>
            <p style={{color:"#64748b",fontSize:13,margin:"0 0 4px"}}>{qr.date} · {qr.time_slot}</p>
            <p style={{color:"#94a3b8",fontSize:12,margin:"0 0 20px"}}>{qr.purpose}</p>
            <div style={{display:"flex",justifyContent:"center",marginBottom:18}}><QRCode text={"res-"+qr.id+"-"+(qr.facility_name||"")}/></div>
            {qr.status==="승인"
              ?<div style={{background:"#dcfce7",borderRadius:13,padding:11,marginBottom:14}}><span style={{color:"#16a34a",fontWeight:800,fontSize:13}}>✅ 승인 완료 · 입실 QR</span></div>
              :<div style={{background:"#fef3c7",borderRadius:13,padding:11,marginBottom:14}}><span style={{color:"#d97706",fontWeight:800,fontSize:13}}>⏳ 관리자 승인 대기 중</span></div>
            }
            <button onClick={function(){ setQr(null); }} style={{width:"100%",background:"#f1f5f9",border:"none",borderRadius:15,padding:14,fontSize:15,fontWeight:700,cursor:"pointer",color:"#374151"}}>닫기</button>
          </div>
        </div>
      )}

      {/* 등록/수정 모달 */}
      {regModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,15,35,.6)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={function(e){ if(e.target===e.currentTarget)setRegModal(null); }}>
          <div style={{background:"white",borderRadius:"26px 26px 0 0",padding:"28px 24px 44px",width:"100%",maxWidth:430,animation:"slideUp .32s ease",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{width:42,height:5,background:"#e2e8f0",borderRadius:99,margin:"0 auto 22px"}}/>
            <h3 style={{fontSize:18,fontWeight:900,margin:"0 0 22px"}}>{regModal.editing?"✏ 정보 수정":"+ 새로 등록"} · {regModal.type==="facility"?"특별실":"교구·기기"}</h3>
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
            <div style={{fontSize:44,marginBottom:12}}>🗑</div>
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
    </div>
  );
}
