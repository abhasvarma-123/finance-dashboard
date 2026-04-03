import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────
const CATEGORIES = ["Food & Dining","Transport","Shopping","Entertainment","Health","Utilities","Salary","Freelance","Investment","Rent"];

const CATEGORY_COLORS = {
  "Food & Dining":"#FF6B6B", Transport:"#4ECDC4", Shopping:"#FFE66D",
  Entertainment:"#A29BFE", Health:"#6BCB77", Utilities:"#FD7F6F",
  Salary:"#00B4D8", Freelance:"#48CAE4", Investment:"#74C69D", Rent:"#F4A261",
};

// ── PERSONA BADGES config ──
// Each role gets a persona: avatar initials, title, color theme, and capability list
const PERSONAS = {
  admin: {
    avatar:"AV", title:"Finance Admin", color:"#f59e0b", bg:"#fef3c7",
    tagline:"Full control · Can edit everything",
    caps:["View Dashboard","Manage Transactions","Add / Edit / Delete","Export CSV","View Insights"],
  },
  viewer: {
    avatar:"RS", title:"Read-Only Viewer", color:"#6366f1", bg:"#e0e7ff",
    tagline:"View-only access · No edits",
    caps:["View Dashboard","Browse Transactions","Export CSV","View Insights"],
  },
};

const MOCK_USERS = [
  { id:1, name:"Abha Varma",   email:"admin@finflow.com",  password:"admin123",  role:"admin"  },
  { id:2, name:"Rahul Sharma", email:"viewer@finflow.com", password:"viewer123", role:"viewer" },
];

const INITIAL_TXS = [
  { id:1,  date:"2026-03-01", description:"Salary Credit",     category:"Salary",       amount:85000, type:"income"  },
  { id:2,  date:"2026-03-02", description:"Swiggy Order",      category:"Food & Dining", amount:450,   type:"expense" },
  { id:3,  date:"2026-03-03", description:"Uber Ride",         category:"Transport",     amount:220,   type:"expense" },
  { id:4,  date:"2026-03-05", description:"Amazon Shopping",   category:"Shopping",      amount:3200,  type:"expense" },
  { id:5,  date:"2026-03-06", description:"Netflix",           category:"Entertainment", amount:649,   type:"expense" },

];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const fmt     = (n) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});

const getSummary = (txs) => {
  const income  = txs.filter(t=>t.type==="income" ).reduce((s,t)=>s+t.amount,0);
  const expense = txs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  return { income, expense, balance:income-expense };
};

const groupByCategory = (txs) => {
  const map={};
  txs.filter(t=>t.type==="expense").forEach(t=>{ map[t.category]=(map[t.category]||0)+t.amount; });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]);
};

const getMonthlyData = (txs) => {
  const map={};
  txs.forEach(t=>{
    const m=t.date.slice(0,7);
    if(!map[m]) map[m]={income:0,expense:0};
    map[m][t.type]+=t.amount;
  });
  return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([month,v])=>({month,...v,balance:v.income-v.expense}));
};

// ── SMART SPLITTING helper ──
// Classifies a transaction into a spending "bucket" with smart label + advice
const SPLIT_RULES = [
  { cats:["Rent"],                          bucket:"Fixed",    label:"Fixed Costs",   color:"#6366f1", advice:"Recurring obligations — hard to cut." },
  { cats:["Salary","Freelance","Investment"],bucket:"Income",   label:"Income / Returns",color:"#22c55e",advice:"Keep growing this side." },
  { cats:["Utilities"],                     bucket:"Utility",  label:"Utilities",     color:"#FD7F6F", advice:"Review plans to save." },
  { cats:["Food & Dining"],                 bucket:"Food",     label:"Food & Dining", color:"#FF6B6B", advice:"Small cuts here add up fast." },
  { cats:["Transport"],                     bucket:"Mobility", label:"Transport",     color:"#4ECDC4", advice:"Consider monthly passes." },
  { cats:["Health"],                        bucket:"Health",   label:"Health",        color:"#6BCB77", advice:"Essential — prioritise." },
  { cats:["Shopping","Entertainment"],      bucket:"Lifestyle",label:"Lifestyle",     color:"#A29BFE", advice:"Most flexible area to trim." },
];

const getBucket = (cat) => SPLIT_RULES.find(r=>r.cats.includes(cat)) || { bucket:"Other", label:"Other", color:"#aaa", advice:"" };

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────
const Ctx    = createContext();
const useApp = () => useContext(Ctx);

function AppProvider({ children }) {
  const load = (key, fallback) => { try{ return JSON.parse(localStorage.getItem(key))??fallback; }catch{ return fallback; } };

  const [user,         setUser]         = useState(()=>load("fin_user",null));
  const [transactions, setTransactions] = useState(()=>load("fin_txs", INITIAL_TXS));
  const [darkMode,     setDarkMode]     = useState(()=>load("fin_dark",false));
  const [filters,      setFilters]      = useState({search:"",type:"all",category:"all",month:"all"});
  const [activeTab,    setActiveTab]    = useState("dashboard");

  useEffect(()=>{ localStorage.setItem("fin_txs",  JSON.stringify(transactions)); },[transactions]);
  useEffect(()=>{ localStorage.setItem("fin_user", JSON.stringify(user)); },[user]);
  useEffect(()=>{ localStorage.setItem("fin_dark", darkMode); document.documentElement.classList.toggle("dark",darkMode); },[darkMode]);

  const login  = (email,pw) => { const u=MOCK_USERS.find(u=>u.email===email&&u.password===pw); if(u){setUser(u);return null;} return "Invalid email or password."; };
  const logout = () => { setUser(null); setActiveTab("dashboard"); };

  const addTransaction    = (tx) => setTransactions(p=>[{...tx,id:Date.now()},...p]);
  const editTransaction   = (id,up)=> setTransactions(p=>p.map(t=>t.id===id?{...t,...up}:t));
  const deleteTransaction = (id) => setTransactions(p=>p.filter(t=>t.id!==id));

  const filteredTransactions = transactions.filter(t=>{
    const s=filters.search.toLowerCase();
    return (!s||t.description.toLowerCase().includes(s)||t.category.toLowerCase().includes(s))
      &&(filters.type==="all"     ||t.type===filters.type)
      &&(filters.category==="all" ||t.category===filters.category)
      &&(filters.month==="all"    ||t.date.startsWith(filters.month));
  });

  return (
    <Ctx.Provider value={{
      user,login,logout,
      transactions,filteredTransactions,
      darkMode,setDarkMode,
      filters,setFilters,
      activeTab,setActiveTab,
      addTransaction,editTransaction,deleteTransaction,
    }}>
      {children}
    </Ctx.Provider>
  );
}

// ─────────────────────────────────────────────
// ① SPARKLINE component
// Mini inline SVG line chart — used inside summary cards
// ─────────────────────────────────────────────
function Sparkline({ values=[], color="#2a5cff", width=80, height=32 }) {
  if(values.length<2) return null;
  const min=Math.min(...values), max=Math.max(...values);
  const range=max-min||1;
  const xs=values.map((_,i)=>((i/(values.length-1))*width));
  const ys=values.map(v=>height-4-((v-min)/range)*(height-8));
  const pts=xs.map((x,i)=>`${x},${ys[i]}`).join(" ");
  const area=`M ${xs[0]},${height} `+xs.map((x,i)=>`L ${x},${ys[i]}`).join(" ")+` L ${xs[xs.length-1]},${height} Z`;
  const up=values[values.length-1]>=values[0];
  const c=up?"#22c55e":"#ef4444";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{width,height,display:"block"}}>
      <path d={area} fill={c} fillOpacity="0.15"/>
      <polyline points={pts} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="3" fill={c}/>
    </svg>
  );
}

// ─────────────────────────────────────────────
// ② PERSONA BADGE component
// Shows a rich user card with role, avatar, capabilities
// ─────────────────────────────────────────────
function PersonaBadge({ user, expanded=false }) {
  const [open,setOpen]=useState(false);
  if(!user) return null;
  const p=PERSONAS[user.role]||PERSONAS.viewer;
  const show=expanded||open;

  return (
    <div className="persona-wrap" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
      <div className="persona-chip" style={{borderColor:p.color+"44",background:p.bg+"cc"}}>
        <div className="persona-avatar" style={{background:p.color,color:"#fff"}}>{p.avatar}</div>
        <div className="persona-info">
          <span className="persona-name">{user.name}</span>
          <span className="persona-title" style={{color:p.color}}>{p.title}</span>
        </div>
        <span className="persona-caret" style={{color:p.color}}>{show?"▲":"▼"}</span>
      </div>
      {show&&(
        <div className="persona-dropdown glass">
          <div className="persona-tagline">{p.tagline}</div>
          <div className="persona-caps">
            {p.caps.map(c=><div key={c} className="persona-cap"><span style={{color:p.color}}>✓</span> {c}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
function LoginPage() {
  const {login,darkMode,setDarkMode} = useApp();
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    setError("");
    if(!email||!pass){ setError("Please fill in all fields."); return; }
    setLoading(true);
    await new Promise(r=>setTimeout(r,500));
    const err = login(email,pass);
    if(err) setError(err);
    setLoading(false);
  };

  const fill = (role) => {
    setEmail(role==="admin"?"admin@finflow.com":"viewer@finflow.com");
    setPass(role==="admin"?"admin123":"viewer123");
    setError("");
  };

  return (
    <div className="login-bg">
      {/* Glassmorphism blobs in background */}
      <div className="glass-blob blob1"/>
      <div className="glass-blob blob2"/>
      <div className="glass-blob blob3"/>
      <button className="dark-toggle login-dark-btn" onClick={()=>setDarkMode(!darkMode)}>{darkMode?"☀":"◑"}</button>
      {/* Login card uses glassmorphism */}
      <div className="login-card glass">
        <div className="login-logo">
          <span className="brand-icon">₹</span>
          <span className="brand-name">FinFlow</span>
        </div>
        <p className="login-subtitle">Sign in to your dashboard</p>

        {error && <div className="login-error">{error}</div>}

        <div className="login-field">
          <label>Email</label>
          <input type="email" placeholder="you@example.com" value={email}
            onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}/>
        </div>
        <div className="login-field">
          <label>Password</label>
          <div className="pass-wrap">
            <input type={showPw?"text":"password"} placeholder="••••••••" value={pass}
              onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}/>
            <button className="pass-eye" onClick={()=>setShowPw(!showPw)}>{showPw?"🙈":"👁"}</button>
          </div>
        </div>

        <button className="btn-primary login-btn" onClick={doLogin} disabled={loading}>
          {loading?<span className="spinner"/>:"Sign In →"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────
const TABS=[{id:"dashboard",label:"Dashboard",icon:"◈"},{id:"transactions",label:"Transactions",icon:"⇄"},{id:"insights",label:"Insights",icon:"◉"},{id:"split",label:"Split View",icon:"⊞"}];

function Navbar() {
  const {user,logout,darkMode,setDarkMode,activeTab,setActiveTab}=useApp();
  return (
    <nav className="navbar glass-nav">
      <div className="navbar-brand"><span className="brand-icon">₹</span><span className="brand-name">FinFlow</span></div>
      <div className="navbar-tabs">
        {TABS.map(t=>(
          <button key={t.id} className={`tab-btn ${activeTab===t.id?"active":""}`} onClick={()=>setActiveTab(t.id)}>
            <span className="tab-icon">{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="navbar-controls">
        {/* ② Persona Badge in navbar */}
        <PersonaBadge user={user}/>
        <button className="dark-toggle" onClick={()=>setDarkMode(!darkMode)}>{darkMode?"☀":"◑"}</button>
        <button className="btn-logout" onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────
// SUMMARY CARDS  — with ① Sparklines
// ─────────────────────────────────────────────
function SummaryCards() {
  const {transactions}=useApp();
  const {income,expense,balance}=getSummary(transactions);
  const monthly=getMonthlyData(transactions);

  // Build sparkline series per card from monthly data
  const incomeSpk  = monthly.map(m=>m.income);
  const expenseSpk = monthly.map(m=>m.expense);
  const balanceSpk = monthly.map(m=>m.balance);
  const savingsSpk = monthly.map(m=>m.income>0?Math.round(((m.income-m.expense)/m.income)*100):0);

  const cards=[
    {label:"Total Balance",  value:fmt(balance), icon:"◈", cls:"card-balance", sub:balance>=0?"You're in the green":"Overspent",                 spk:balanceSpk},
    {label:"Total Income",   value:fmt(income),  icon:"↑", cls:"card-income",  sub:"All credited amounts",                                        spk:incomeSpk},
    {label:"Total Expenses", value:fmt(expense), icon:"↓", cls:"card-expense", sub:"All debited amounts",                                         spk:expenseSpk},
    {label:"Savings Rate",   value:income>0?`${Math.round(((income-expense)/income)*100)}%`:"—", icon:"◎", cls:"card-savings", sub:"of income retained", spk:savingsSpk},
  ];

  return (
    <div className="summary-cards">
      {cards.map(c=>(
        <div key={c.label} className={`summary-card ${c.cls} glass-card`}>
          <div className="card-header"><span className="card-icon">{c.icon}</span><span className="card-label">{c.label}</span></div>
          <div className="card-value">{c.value}</div>
          <div className="card-footer-row">
            <span className="card-sub">{c.sub}</span>
            {/* ① Sparkline inside card */}
            <Sparkline values={c.spk} width={72} height={28}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// BALANCE TREND (SVG)
// ─────────────────────────────────────────────
function BalanceTrend() {
  const {transactions}=useApp();
  const data=getMonthlyData(transactions);
  if(!data.length) return <div className="chart-card glass-card"><div className="chart-empty">No data</div></div>;

  const W=560,H=220,PAD=48;
  const maxVal=Math.max(...data.map(d=>Math.max(d.income,d.expense,1)));
  const xStep=(W-PAD*2)/Math.max(data.length-1,1);
  const pt=(i,v)=>({x:PAD+i*xStep, y:PAD+(1-v/maxVal)*(H-PAD*2)});
  const line=(key)=>data.map((d,i)=>`${i===0?"M":"L"} ${pt(i,d[key]).x} ${pt(i,d[key]).y}`).join(" ");
  const area=(key)=>{
    const pts=data.map((d,i)=>pt(i,d[key]));
    return `M ${pts[0].x} ${H-PAD} `+pts.map(p=>`L ${p.x} ${p.y}`).join(" ")+` L ${pts[pts.length-1].x} ${H-PAD} Z`;
  };

  return (
    <div className="chart-card glass-card">
      <div className="chart-title">Balance Trend</div>
      <div className="chart-legend"><span className="legend-income">▬ Income</span><span className="legend-expense">▬ Expenses</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="trend-svg">
        {[0,.25,.5,.75,1].map(f=><line key={f} x1={PAD} y1={PAD+(1-f)*(H-PAD*2)} x2={W-PAD} y2={PAD+(1-f)*(H-PAD*2)} className="grid-line"/>)}
        <path d={area("income")}  className="area-income"/>
        <path d={area("expense")} className="area-expense"/>
        <path d={line("income")}  className="line-income"/>
        <path d={line("expense")} className="line-expense"/>
        {data.map((d,i)=>(
          <g key={i}>
            <circle cx={pt(i,d.income).x}  cy={pt(i,d.income).y}  r="5" className="dot-income"/>
            <circle cx={pt(i,d.expense).x} cy={pt(i,d.expense).y} r="5" className="dot-expense"/>
            <text x={pt(i,d.income).x} y={H-8} className="axis-label" textAnchor="middle">
              {new Date(d.month+"-01").toLocaleDateString("en-IN",{month:"short"})}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// DONUT CHART
// ─────────────────────────────────────────────
function SpendingBreakdown() {
  const {transactions}=useApp();
  const data=groupByCategory(transactions);
  const [hov,setHov]=useState(null);
  if(!data.length) return <div className="chart-card glass-card"><div className="chart-empty">No expense data</div></div>;

  const total=data.reduce((s,[,v])=>s+v,0);
  const cx=110,cy=110,r=90,inner=55;
  const ang2xy=(a,rad)=>({x:cx+rad*Math.cos(((a-90)*Math.PI)/180),y:cy+rad*Math.sin(((a-90)*Math.PI)/180)});

  let ang=0;
  const slices=data.map(([cat,val])=>{
    const sw=(val/total)*360, s=ang, e=ang+sw; ang+=sw;
    return {cat,val,s,e};
  });

  const active=hov?data.find(([c])=>c===hov):null;

  return (
    <div className="chart-card glass-card">
      <div className="chart-title">Spending Breakdown</div>
      <div className="donut-wrap">
        <svg viewBox="0 0 220 220" className="donut-svg">
          {slices.map(({cat,s,e})=>{
            const lg=e-s>180?1:0;
            const sp=ang2xy(s,r),ep=ang2xy(e,r),si=ang2xy(s,inner),ei=ang2xy(e,inner);
            return (
              <path key={cat}
                d={`M ${sp.x} ${sp.y} A ${r} ${r} 0 ${lg} 1 ${ep.x} ${ep.y} L ${ei.x} ${ei.y} A ${inner} ${inner} 0 ${lg} 0 ${si.x} ${si.y} Z`}
                fill={CATEGORY_COLORS[cat]||"#aaa"}
                opacity={hov===null||hov===cat?1:0.4}
                style={{cursor:"pointer",transition:"opacity 0.2s"}}
                onMouseEnter={()=>setHov(cat)} onMouseLeave={()=>setHov(null)}/>
            );
          })}
          <text x={cx} y={cy-8}  textAnchor="middle" className="donut-center-label">{active?active[0].split(" ")[0]:"Total"}</text>
          <text x={cx} y={cy+14} textAnchor="middle" className="donut-center-value">{active?fmt(active[1]):fmt(total)}</text>
        </svg>
        <div className="donut-legend">
          {data.slice(0,7).map(([cat,val])=>(
            <div key={cat} className={`legend-item ${hov===cat?"legend-active":""}`}
              onMouseEnter={()=>setHov(cat)} onMouseLeave={()=>setHov(null)}>
              <span className="legend-dot" style={{background:CATEGORY_COLORS[cat]||"#aaa"}}/>
              <span className="legend-cat">{cat}</span>
              <span className="legend-pct">{Math.round((val/total)*100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TRANSACTION MODAL
// ─────────────────────────────────────────────
const EMPTY={date:"",description:"",category:CATEGORIES[0],amount:"",type:"expense"};

function TransactionModal({tx,onClose}) {
  const {addTransaction,editTransaction}=useApp();
  const [form,setForm]=useState(tx?{...tx,amount:String(tx.amount)}:EMPTY);
  const [err,setErr]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const submit=()=>{
    if(!form.date||!form.description||!form.amount){setErr("All fields required.");return;}
    const amt=parseFloat(form.amount);
    if(isNaN(amt)||amt<=0){setErr("Enter a valid amount.");return;}
    tx?editTransaction(tx.id,{...form,amount:amt}):addTransaction({...form,amount:amt});
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box glass" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><span>{tx?"Edit Transaction":"Add Transaction"}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        {err&&<div className="modal-error">{err}</div>}
        <div className="modal-body">
          <label>Date<input type="date" value={form.date} onChange={e=>set("date",e.target.value)}/></label>
          <label>Description<input type="text" placeholder="e.g. Salary Credit" value={form.description} onChange={e=>set("description",e.target.value)}/></label>
          <label>Amount (₹)<input type="number" placeholder="0" min="1" value={form.amount} onChange={e=>set("amount",e.target.value)}/></label>
          <label>Category
            <select value={form.category} onChange={e=>set("category",e.target.value)}>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Type
            <select value={form.type} onChange={e=>set("type",e.target.value)}>
              <option value="income">Income</option><option value="expense">Expense</option>
            </select>
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>{tx?"Save Changes":"Add"}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TRANSACTIONS PAGE
// ─────────────────────────────────────────────
const MONTH_OPTS=[
  {val:"all",label:"All Months"},{val:"2026-03",label:"March 2026"},
  {val:"2026-02",label:"February 2026"},{val:"2026-01",label:"January 2026"},
];

function Transactions() {
  const {filteredTransactions,filters,setFilters,user,deleteTransaction}=useApp();
  const [sortKey,setSortKey]=useState("date");
  const [sortDir,setSortDir]=useState("desc");
  const [modal,setModal]=useState(null);
  const role=user?.role;

  const sorted=[...filteredTransactions].sort((a,b)=>{
    let av=a[sortKey],bv=b[sortKey];
    if(sortKey==="amount"){av=Number(av);bv=Number(bv);}
    return av<bv?(sortDir==="asc"?-1:1):av>bv?(sortDir==="asc"?1:-1):0;
  });

  const toggleSort=(key)=>{ if(sortKey===key)setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortKey(key);setSortDir("asc");} };

  const exportCSV=()=>{
    const rows=[["Date","Description","Category","Type","Amount"]];
    sorted.forEach(t=>rows.push([t.date,t.description,t.category,t.type,t.amount]));
    const a=document.createElement("a");
    a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(rows.map(r=>r.join(",")).join("\n"));
    a.download="transactions.csv"; a.click();
  };

  return (
    <div className="section">
      <div className="section-header">
        <h2>Transactions</h2>
        <div className="header-actions">
          {role==="admin"&&<button className="btn-primary" onClick={()=>setModal(false)}>+ Add</button>}
          <button className="btn-secondary" onClick={exportCSV}>↓ CSV</button>
        </div>
      </div>

      <div className="filters-row">
        <input className="filter-input" placeholder="Search…" value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))}/>
        <select className="filter-select" value={filters.type} onChange={e=>setFilters(f=>({...f,type:e.target.value}))}>
          <option value="all">All Types</option><option value="income">Income</option><option value="expense">Expense</option>
        </select>
        <select className="filter-select" value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={filters.month} onChange={e=>setFilters(f=>({...f,month:e.target.value}))}>
          {MONTH_OPTS.map(m=><option key={m.val} value={m.val}>{m.label}</option>)}
        </select>
      </div>

      {sorted.length===0
        ?<div className="empty-state">No transactions match your filters.</div>
        :<div className="table-wrap glass-card">
          <table className="tx-table">
            <thead><tr>
              {[["date","Date"],["description","Description"],["category","Category"],["type","Type"],["amount","Amount"]].map(([k,l])=>(
                <th key={k} onClick={()=>toggleSort(k)} className="sortable-th">{l} {sortKey===k?(sortDir==="asc"?"↑":"↓"):"↕"}</th>
              ))}
              {role==="admin"&&<th>Actions</th>}
            </tr></thead>
            <tbody>
              {sorted.map(t=>(
                <tr key={t.id} className="tx-row">
                  <td>{fmtDate(t.date)}</td>
                  <td className="tx-desc">{t.description}</td>
                  <td><span className="cat-badge" style={{background:(CATEGORY_COLORS[t.category]||"#aaa")+"22",color:CATEGORY_COLORS[t.category]||"#aaa"}}>{t.category}</span></td>
                  <td><span className={`type-badge ${t.type}`}>{t.type}</span></td>
                  <td className={`amount ${t.type}`}>{t.type==="income"?"+":"-"}{fmt(t.amount)}</td>
                  {role==="admin"&&<td className="action-btns">
                    <button className="btn-edit" onClick={()=>setModal(t)}>✎</button>
                    <button className="btn-delete" onClick={()=>deleteTransaction(t.id)}>✕</button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
      {modal!==null&&<TransactionModal tx={modal||null} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ─────────────────────────────────────────────
// ④ SMART SPLIT VIEW — new tab
// Groups transactions into smart buckets with per-bucket sparkline + advice
// ─────────────────────────────────────────────
function SmartSplitView() {
  const {transactions}=useApp();
  const monthly=getMonthlyData(transactions);

  // Build bucket breakdown
  const bucketMap={};
  transactions.forEach(t=>{
    const b=getBucket(t.category);
    if(!bucketMap[b.bucket]) bucketMap[b.bucket]={...b, total:0, txs:[], monthlyTotals:{}};
    bucketMap[b.bucket].total+=t.amount;
    bucketMap[b.bucket].txs.push(t);
    const m=t.date.slice(0,7);
    bucketMap[b.bucket].monthlyTotals[m]=(bucketMap[b.bucket].monthlyTotals[m]||0)+t.amount;
  });

  const buckets=Object.values(bucketMap).sort((a,b)=>b.total-a.total);
  const totalAll=buckets.reduce((s,b)=>s+b.total,0);
  const expenseTotal=transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);

  // Months for sparkline x-axis
  const months=monthly.map(m=>m.month);

  const [activeBucket,setActiveBucket]=useState(null);

  return (
    <div className="section">
      <div className="section-header">
        <h2>Smart Split</h2>
        <span className="split-subtitle">AI-style spending categorisation</span>
      </div>

      {/* ── Buckets grid ── */}
      <div className="split-grid">
        {buckets.map(b=>{
          const spkVals=months.map(m=>b.monthlyTotals[m]||0);
          const pct=totalAll>0?Math.round((b.total/totalAll)*100):0;
          const expPct=b.bucket!=="Income"&&expenseTotal>0?Math.round((b.total/expenseTotal)*100):null;
          const isActive=activeBucket===b.bucket;

          return (
            <div key={b.bucket}
              className={`split-card glass-card ${isActive?"split-active":""}`}
              style={{"--split-color":b.color}}
              onClick={()=>setActiveBucket(isActive?null:b.bucket)}>
              <div className="split-card-top">
                <div className="split-label-row">
                  <span className="split-dot" style={{background:b.color}}/>
                  <span className="split-label">{b.label}</span>
                  <span className="split-count">{b.txs.length} txs</span>
                </div>
                {/* ① Sparkline per bucket */}
                <Sparkline values={spkVals} width={64} height={26}/>
              </div>
              <div className="split-amount" style={{color:b.color}}>{fmt(b.total)}</div>
              <div className="split-bar-row">
                <div className="split-bar-track">
                  <div className="split-bar-fill" style={{width:`${pct}%`,background:b.color}}/>
                </div>
                <span className="split-pct">{pct}%</span>
              </div>
              <div className="split-advice">{b.advice}</div>

              {/* Expanded: show txs in this bucket */}
              {isActive&&(
                <div className="split-txs">
                  {b.txs.slice(0,6).map(t=>(
                    <div key={t.id} className="split-tx-row">
                      <span className="split-tx-desc">{t.description}</span>
                      <span className={`split-tx-amt ${t.type}`}>{t.type==="income"?"+":"-"}{fmt(t.amount)}</span>
                    </div>
                  ))}
                  {b.txs.length>6&&<div className="split-more">+{b.txs.length-6} more transactions</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Summary row ── */}
      <div className="split-summary glass-card">
        <div className="split-sum-title">Spending Composition</div>
        <div className="split-rainbow">
          {buckets.filter(b=>b.bucket!=="Income").map(b=>{
            const pct=expenseTotal>0?Math.round((b.total/expenseTotal)*100):0;
            return pct>0&&(
              <div key={b.bucket} title={`${b.label}: ${pct}%`}
                style={{width:`${pct}%`,background:b.color,height:"100%",transition:"width .4s"}}/>
            );
          })}
        </div>
        <div className="split-rainbow-labels">
          {buckets.filter(b=>b.bucket!=="Income").map(b=>{
            const pct=expenseTotal>0?Math.round((b.total/expenseTotal)*100):0;
            return pct>3&&(
              <div key={b.bucket} className="split-rl-item">
                <span style={{width:10,height:10,borderRadius:"50%",background:b.color,display:"inline-block",marginRight:4}}/>
                {b.label} {pct}%
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// INSIGHTS PAGE
// ─────────────────────────────────────────────
function Insights() {
  const {transactions}=useApp();
  const byCategory=groupByCategory(transactions);
  const monthly=getMonthlyData(transactions);
  const {income,expense}=getSummary(transactions);
  const topCat=byCategory[0];
  const totalExp=byCategory.reduce((s,[,v])=>s+v,0);
  const lastTwo=monthly.slice(-2);
  const [prev,curr]=[lastTwo[0],lastTwo[1]];

  return (
    <div className="section">
      <div className="section-header"><h2>Insights</h2></div>
      <div className="insights-grid">

        <div className="insight-card highlight glass-card">
          <div className="insight-icon">🔥</div>
          <div className="insight-body">
            <div className="insight-label">Highest Spending Category</div>
            <div className="insight-value" style={{color:topCat?CATEGORY_COLORS[topCat[0]]:"inherit"}}>{topCat?topCat[0]:"—"}</div>
            <div className="insight-sub">{topCat?`${fmt(topCat[1])} · ${Math.round((topCat[1]/totalExp)*100)}% of total`:"No data"}</div>
          </div>
        </div>

        <div className="insight-card glass-card">
          <div className="insight-icon">💰</div>
          <div className="insight-body">
            <div className="insight-label">Overall Savings Rate</div>
            <div className="insight-value">{income>0?`${Math.round(((income-expense)/income)*100)}%`:"—"}</div>
            <div className="insight-sub">of total income saved</div>
          </div>
        </div>

        {curr&&prev&&(
          <div className="insight-card glass-card">
            <div className="insight-icon">📅</div>
            <div className="insight-body">
              <div className="insight-label">Monthly Expense Change</div>
              <div className={`insight-value ${curr.expense>prev.expense?"neg":"pos"}`}>
                {curr.expense>prev.expense?"▲":"▼"} {Math.abs(Math.round(((curr.expense-prev.expense)/prev.expense)*100))}%
              </div>
              <div className="insight-sub">{curr.expense>prev.expense?"More":"Less"} spending vs last month</div>
            </div>
          </div>
        )}

        <div className="insight-card wide glass-card">
          <div className="insight-icon">📊</div>
          <div className="insight-body full">
            <div className="insight-label">Top Spending Categories</div>
            <div className="bar-list">
              {byCategory.slice(0,5).map(([cat,val])=>(
                <div key={cat} className="bar-row">
                  <span className="bar-cat">{cat}</span>
                  <div className="bar-track"><div className="bar-fill" style={{width:`${Math.round((val/byCategory[0][1])*100)}%`,background:CATEGORY_COLORS[cat]||"#aaa"}}/></div>
                  <span className="bar-val">{fmt(val)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="insight-card wide glass-card">
          <div className="insight-icon">🗓</div>
          <div className="insight-body full">
            <div className="insight-label">Monthly Comparison</div>
            <table className="insight-table">
              <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead>
              <tbody>
                {monthly.map(m=>(
                  <tr key={m.month}>
                    <td>{new Date(m.month+"-01").toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</td>
                    <td className="pos">+{fmt(m.income)}</td>
                    <td className="neg">-{fmt(m.expense)}</td>
                    <td className={m.balance>=0?"pos":"neg"}>{fmt(m.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
function Dashboard() {
  return (
    <div className="section">
      <div className="section-header"><h2>Dashboard</h2></div>
      <SummaryCards/>
      <div className="charts-row"><BalanceTrend/><SpendingBreakdown/></div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

:root{
  --bg:#f0efe9;--bg2:#ffffff;--bg3:#e8e7e0;--border:#dddcd4;
  --text:#1a1916;--text2:#6b6a64;--accent:#2a5cff;--green:#22c55e;--red:#ef4444;
  --shadow:0 2px 12px rgba(0,0,0,0.07);--r:14px;
  --font:'Syne',sans-serif;--mono:'DM Mono',monospace;
  --glass-bg:rgba(255,255,255,0.55);--glass-border:rgba(255,255,255,0.7);
  --glass-shadow:0 8px 32px rgba(0,0,0,0.08);
  --blob1:#a5b4fc;--blob2:#86efac;--blob3:#fca5a5;
}
html.dark{
  --bg:#0f0f0e;--bg2:#1a1a18;--bg3:#222220;--border:#2a2a27;
  --text:#f0efe8;--text2:#888880;--shadow:0 2px 16px rgba(0,0,0,0.4);
  --glass-bg:rgba(28,28,26,0.65);--glass-border:rgba(255,255,255,0.08);
  --glass-shadow:0 8px 32px rgba(0,0,0,0.35);
  --blob1:#3730a3;--blob2:#166534;--blob3:#991b1b;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;transition:background .3s,color .3s;}

/* ② GLASSMORPHISM base */
.glass{
  background:var(--glass-bg)!important;
  backdrop-filter:blur(18px) saturate(180%);
  -webkit-backdrop-filter:blur(18px) saturate(180%);
  border:1px solid var(--glass-border)!important;
  box-shadow:var(--glass-shadow)!important;
}
.glass-card{
  background:var(--glass-bg);
  backdrop-filter:blur(12px) saturate(160%);
  -webkit-backdrop-filter:blur(12px) saturate(160%);
  border:1px solid var(--glass-border);
  box-shadow:var(--glass-shadow);
}
.glass-nav{
  background:var(--glass-bg)!important;
  backdrop-filter:blur(20px) saturate(200%);
  -webkit-backdrop-filter:blur(20px) saturate(200%);
  border-bottom:1px solid var(--glass-border)!important;
  box-shadow:0 1px 24px rgba(0,0,0,0.06)!important;
}

/* BACKGROUND BLOBS */
.glass-blob{position:fixed;border-radius:50%;filter:blur(80px);opacity:0.3;pointer-events:none;z-index:0;}
.blob1{width:420px;height:420px;top:-100px;left:-80px;background:var(--blob1);}
.blob2{width:340px;height:340px;bottom:-60px;right:10%;background:var(--blob2);}
.blob3{width:280px;height:280px;top:40%;right:-60px;background:var(--blob3);}

/* LOGIN */
.login-bg{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
.login-dark-btn{position:absolute;top:20px;right:20px;z-index:10;}
.login-card{padding:40px;width:400px;max-width:95vw;border-radius:20px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:2;}
.login-logo{display:flex;align-items:center;gap:10px;justify-content:center;}
.login-subtitle{text-align:center;color:var(--text2);font-size:14px;}
.login-error{background:#fee2e2;color:var(--red);padding:10px 14px;border-radius:8px;font-size:13px;}
.login-field{display:flex;flex-direction:column;gap:6px;}
.login-field label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text2);}
.login-field input{padding:10px 14px;border-radius:9px;border:1px solid var(--border);background:rgba(255,255,255,0.4);color:var(--text);font-family:var(--font);font-size:14px;transition:border-color .2s;backdrop-filter:blur(4px);}
.login-field input:focus{outline:none;border-color:var(--accent);}
.pass-wrap{position:relative;}
.pass-wrap input{width:100%;padding-right:44px;}
.pass-eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;}
.login-btn{width:100%;padding:12px;font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:10px;}
.demo-section{display:flex;flex-direction:column;gap:8px;align-items:center;}
.demo-label{font-size:11px;color:var(--text2);font-weight:700;text-transform:uppercase;letter-spacing:.6px;}
.demo-btns{display:flex;gap:8px;}
.demo-btn{padding:7px 18px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.3);color:var(--text);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;transition:all .18s;backdrop-filter:blur(4px);}
.admin-demo:hover{background:#fef3c7;border-color:#f59e0b;color:#92400e;}
.viewer-demo:hover{background:#e0e7ff;border-color:#6366f1;color:#3730a3;}
.login-hint{display:flex;flex-direction:column;gap:3px;align-items:center;}
.login-hint span{font-size:11px;color:var(--text2);font-family:var(--mono);}
.spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;display:inline-block;}
@keyframes spin{to{transform:rotate(360deg)}}

/* NAVBAR */
.navbar{display:flex;align-items:center;gap:20px;padding:0 28px;height:60px;position:sticky;top:0;z-index:100;}
.navbar-brand{display:flex;align-items:center;gap:8px;}
.brand-icon{font-size:22px;font-weight:800;color:var(--accent);}
.brand-name{font-size:18px;font-weight:800;letter-spacing:-.5px;}
.navbar-tabs{display:flex;gap:4px;flex:1;justify-content:center;}
.tab-btn{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;border:none;background:transparent;color:var(--text2);font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;transition:all .18s;}
.tab-btn:hover{background:rgba(255,255,255,0.4);color:var(--text);}
.tab-btn.active{background:var(--accent);color:#fff;}
.tab-icon{font-size:13px;}
.navbar-controls{display:flex;align-items:center;gap:8px;}
.dark-toggle{width:34px;height:34px;border-radius:8px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.3);color:var(--text);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .18s;backdrop-filter:blur(4px);}
.dark-toggle:hover{background:var(--accent);color:#fff;}
.btn-logout{padding:6px 12px;border-radius:8px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.3);color:var(--text);font-family:var(--font);font-size:18px;cursor:pointer;transition:all .18s;backdrop-filter:blur(4px);}
.btn-logout:hover{background:var(--red);color:#fff;}

/* ② PERSONA BADGE */
.persona-wrap{position:relative;}
.persona-chip{display:flex;align-items:center;gap:8px;padding:5px 10px 5px 5px;border-radius:50px;border:1.5px solid;cursor:pointer;transition:all .18s;backdrop-filter:blur(8px);}
.persona-chip:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,0.12);}
.persona-avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;}
.persona-info{display:flex;flex-direction:column;line-height:1.2;}
.persona-name{font-size:12px;font-weight:700;}
.persona-title{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;}
.persona-caret{font-size:9px;margin-left:2px;}
.persona-dropdown{position:absolute;top:calc(100% + 8px);right:0;width:220px;border-radius:12px;padding:14px;z-index:200;animation:slideUp .15s ease-out;}
.persona-tagline{font-size:11px;color:var(--text2);margin-bottom:10px;font-style:italic;}
.persona-caps{display:flex;flex-direction:column;gap:5px;}
.persona-cap{font-size:12px;display:flex;gap:6px;align-items:center;}

/* LAYOUT */
.app{min-height:100vh;position:relative;}
.main-content{max-width:1100px;margin:0 auto;padding:28px 24px;position:relative;z-index:1;}
.section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;}
.section-header h2{font-size:22px;font-weight:800;letter-spacing:-.5px;}
.header-actions{display:flex;gap:8px;}
.split-subtitle{font-size:12px;color:var(--text2);font-weight:600;}

/* CARDS */
.summary-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;}
.summary-card{border-radius:var(--r);padding:18px;transition:transform .18s;}
.summary-card:hover{transform:translateY(-2px);}
.card-header{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.card-icon{font-size:18px;}
.card-label{font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;}
.card-value{font-size:24px;font-weight:800;font-family:var(--mono);margin-bottom:8px;}
.card-footer-row{display:flex;align-items:center;justify-content:space-between;}
.card-sub{font-size:11px;color:var(--text2);}
.card-balance .card-value{color:var(--accent);}
.card-income  .card-value{color:var(--green);}
.card-expense .card-value{color:var(--red);}
.card-savings .card-value{color:#f59e0b;}

/* CHARTS */
.charts-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.chart-card{border-radius:var(--r);padding:20px;}
.chart-title{font-size:14px;font-weight:700;margin-bottom:12px;}
.chart-legend{display:flex;gap:16px;font-size:12px;margin-bottom:8px;}
.legend-income{color:var(--green);font-weight:600;}
.legend-expense{color:var(--red);font-weight:600;}
.trend-svg{width:100%;height:auto;}
.grid-line{stroke:var(--border);stroke-width:1;}
.area-income{fill:#22c55e22;}
.area-expense{fill:#ef444422;}
.line-income{fill:none;stroke:var(--green);stroke-width:2.5;stroke-linecap:round;}
.line-expense{fill:none;stroke:var(--red);stroke-width:2.5;stroke-linecap:round;}
.dot-income{fill:var(--green);}
.dot-expense{fill:var(--red);}
.axis-label{fill:var(--text2);font-size:11px;font-family:var(--mono);}
.donut-wrap{display:flex;align-items:center;gap:16px;}
.donut-svg{width:180px;min-width:160px;}
.donut-center-label{fill:var(--text2);font-size:10px;font-family:var(--font);font-weight:600;}
.donut-center-value{fill:var(--text);font-size:13px;font-family:var(--mono);font-weight:700;}
.donut-legend{flex:1;display:flex;flex-direction:column;gap:6px;}
.legend-item{display:flex;align-items:center;gap:8px;cursor:pointer;padding:3px 6px;border-radius:6px;transition:background .15s;}
.legend-item:hover,.legend-active{background:rgba(255,255,255,0.3);}
.legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.legend-cat{font-size:12px;flex:1;}
.legend-pct{font-size:12px;font-family:var(--mono);color:var(--text2);}

/* FILTERS & TABLE */
.filters-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
.filter-input,.filter-select{padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--glass-bg);color:var(--text);font-family:var(--font);font-size:13px;backdrop-filter:blur(8px);}
.filter-input{flex:1;min-width:160px;}
.filter-select{cursor:pointer;}
.table-wrap{overflow-x:auto;border-radius:var(--r);}
.tx-table{width:100%;border-collapse:collapse;}
.tx-table th{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text2);border-bottom:1px solid var(--border);background:rgba(255,255,255,0.15);}
.sortable-th{cursor:pointer;user-select:none;}
.sortable-th:hover{color:var(--accent);}
.tx-table td{padding:10px 14px;font-size:13px;border-bottom:1px solid var(--border);}
.tx-row:last-child td{border-bottom:none;}
.tx-row:hover td{background:rgba(255,255,255,0.2);}
.tx-desc{font-weight:600;}
.cat-badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;}
.type-badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:capitalize;}
.type-badge.income{background:#dcfce7;color:#15803d;}
.type-badge.expense{background:#fee2e2;color:#b91c1c;}
.amount{font-family:var(--mono);font-weight:600;}
.amount.income{color:var(--green);}
.amount.expense{color:var(--red);}
.action-btns{display:flex;gap:6px;}
.btn-edit{padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:rgba(255,255,255,0.3);color:var(--text);cursor:pointer;font-size:14px;}
.btn-edit:hover{background:var(--accent);color:#fff;}
.btn-delete{padding:4px 10px;border-radius:6px;border:1px solid #fca5a5;background:#fee2e2;color:var(--red);cursor:pointer;font-size:14px;}
.btn-delete:hover{background:var(--red);color:#fff;}

/* BUTTONS */
.btn-primary{padding:8px 16px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;transition:opacity .15s;}
.btn-primary:hover{opacity:.88;}
.btn-primary:disabled{opacity:.6;cursor:not-allowed;}
.btn-secondary{padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.3);color:var(--text);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;transition:background .15s;backdrop-filter:blur(4px);}
.btn-secondary:hover{background:rgba(255,255,255,0.5);}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:200;animation:fadeIn .15s;backdrop-filter:blur(4px);}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal-box{border-radius:20px;width:440px;max-width:95vw;animation:slideUp .18s ease-out;}
@keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
.modal-header{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid var(--glass-border);font-size:16px;font-weight:800;}
.modal-close{background:none;border:none;font-size:18px;cursor:pointer;color:var(--text2);}
.modal-close:hover{color:var(--red);}
.modal-error{margin:10px 22px 0;padding:8px 12px;background:#fee2e2;color:var(--red);border-radius:6px;font-size:13px;}
.modal-body{padding:18px 22px;display:flex;flex-direction:column;gap:14px;}
.modal-body label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text2);}
.modal-body input,.modal-body select{padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.3);color:var(--text);font-family:var(--font);font-size:14px;backdrop-filter:blur(4px);}
.modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 22px;border-top:1px solid var(--glass-border);}

/* ④ SMART SPLIT */
.split-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px;}
.split-card{border-radius:var(--r);padding:16px;cursor:pointer;transition:transform .18s,box-shadow .18s;border-left:3px solid var(--split-color,var(--accent));}
.split-card:hover{transform:translateY(-2px);}
.split-active{box-shadow:0 0 0 2px var(--split-color,var(--accent))!important;}
.split-card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;}
.split-label-row{display:flex;align-items:center;gap:6px;}
.split-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.split-label{font-size:12px;font-weight:700;}
.split-count{font-size:10px;color:var(--text2);margin-left:4px;}
.split-amount{font-size:22px;font-weight:800;font-family:var(--mono);margin-bottom:8px;}
.split-bar-row{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.split-bar-track{flex:1;height:6px;background:var(--bg3);border-radius:100px;overflow:hidden;}
.split-bar-fill{height:100%;border-radius:100px;transition:width .4s;}
.split-pct{font-size:11px;font-family:var(--mono);color:var(--text2);width:32px;text-align:right;}
.split-advice{font-size:11px;color:var(--text2);font-style:italic;}
.split-txs{margin-top:12px;border-top:1px solid var(--glass-border);padding-top:10px;display:flex;flex-direction:column;gap:5px;}
.split-tx-row{display:flex;justify-content:space-between;font-size:12px;}
.split-tx-desc{color:var(--text2);flex:1;truncate:clip;}
.split-tx-amt{font-family:var(--mono);font-weight:600;margin-left:8px;}
.split-tx-amt.income{color:var(--green);}
.split-tx-amt.expense{color:var(--red);}
.split-more{font-size:11px;color:var(--text2);text-align:center;margin-top:4px;}
.split-summary{border-radius:var(--r);padding:18px;}
.split-sum-title{font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:10px;}
.split-rainbow{height:14px;border-radius:100px;overflow:hidden;display:flex;margin-bottom:10px;}
.split-rainbow-labels{display:flex;flex-wrap:wrap;gap:10px;}
.split-rl-item{font-size:11px;display:flex;align-items:center;gap:4px;color:var(--text2);}

/* INSIGHTS */
.insights-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.insight-card{border-radius:var(--r);padding:20px;display:flex;gap:14px;align-items:flex-start;}
.insight-card.wide{grid-column:1/-1;}
.insight-card.highlight{border-left:3px solid var(--accent);}
.insight-icon{font-size:22px;}
.insight-body{flex:1;}
.insight-body.full{width:100%;}
.insight-label{font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px;}
.insight-value{font-size:28px;font-weight:800;font-family:var(--mono);margin-bottom:4px;}
.insight-sub{font-size:12px;color:var(--text2);}
.pos{color:var(--green)!important;}
.neg{color:var(--red)!important;}
.bar-list{display:flex;flex-direction:column;gap:10px;margin-top:10px;}
.bar-row{display:flex;align-items:center;gap:10px;}
.bar-cat{font-size:12px;width:120px;flex-shrink:0;}
.bar-track{flex:1;background:var(--bg3);border-radius:100px;height:8px;overflow:hidden;}
.bar-fill{height:100%;border-radius:100px;transition:width .4s ease;}
.bar-val{font-family:var(--mono);font-size:12px;color:var(--text2);width:90px;text-align:right;}
.insight-table{width:100%;border-collapse:collapse;margin-top:10px;}
.insight-table th{text-align:left;font-size:11px;color:var(--text2);font-weight:700;text-transform:uppercase;letter-spacing:.7px;padding:6px 10px;border-bottom:1px solid var(--border);}
.insight-table td{padding:8px 10px;font-size:13px;font-family:var(--mono);border-bottom:1px solid var(--border);}
.insight-table tr:last-child td{border-bottom:none;}
.empty-state{text-align:center;padding:60px 20px;color:var(--text2);font-size:15px;}
.chart-empty{text-align:center;padding:40px;color:var(--text2);}

/* ── RESPONSIVE ── */

/* Tablet landscape: 1024px */
@media(max-width:1024px){
  .summary-cards{grid-template-columns:1fr 1fr;}
  .split-grid{grid-template-columns:1fr 1fr;}
  .main-content{padding:22px 20px;}
}

/* Tablet portrait: 900px */
@media(max-width:900px){
  .summary-cards{grid-template-columns:1fr 1fr;}
  .charts-row{grid-template-columns:1fr;}
  .insights-grid{grid-template-columns:1fr;}
  .insight-card.wide{grid-column:auto;}
  .split-grid{grid-template-columns:1fr 1fr;}
  .donut-wrap{flex-direction:column;align-items:flex-start;}
  .donut-svg{width:160px;}
  .navbar-tabs .tab-btn span:last-child{font-size:12px;}
  .card-value{font-size:20px;}
}

/* Mobile large: 640px */
@media(max-width:640px){
  .navbar{padding:0 12px;gap:6px;height:54px;}
  .navbar-tabs{gap:2px;}
  .navbar-tabs .tab-btn{padding:5px 8px;font-size:12px;}
  .navbar-tabs .tab-btn span:last-child{display:none;}
  .navbar-controls{gap:6px;}
  .persona-info{display:none;}
  .persona-caret{display:none;}
  .persona-chip{padding:4px 6px;}

  .main-content{padding:12px 10px;}
  .section-header h2{font-size:18px;}

  .summary-cards{grid-template-columns:1fr 1fr;gap:10px;}
  .summary-card{padding:14px;}
  .card-value{font-size:18px;}
  .card-label{font-size:10px;}

  .charts-row{grid-template-columns:1fr;gap:10px;}
  .chart-card{padding:14px;}
  .trend-svg{overflow:visible;}

  .split-grid{grid-template-columns:1fr;gap:10px;}
  .split-amount{font-size:18px;}

  .insights-grid{grid-template-columns:1fr;gap:10px;}
  .insight-value{font-size:22px;}

  .filters-row{gap:6px;}
  .filter-input{min-width:100%;order:-1;}
  .filter-select{flex:1;font-size:12px;}

  .table-wrap{font-size:12px;}
  .tx-table th,.tx-table td{padding:8px 8px;}
  .cat-badge,.type-badge{font-size:10px;padding:2px 6px;}

  .modal-box{width:100%;border-radius:20px 20px 0 0;position:fixed;bottom:0;left:0;max-width:100vw;}
  .modal-overlay{align-items:flex-end;}

  .login-card{padding:28px 20px;border-radius:16px;}
  .brand-name{font-size:16px;}

  .bar-cat{width:80px;font-size:11px;}
  .bar-val{font-size:11px;width:70px;}

  .insight-table th,.insight-table td{padding:6px 6px;font-size:11px;}
}

/* Mobile small: 400px */
@media(max-width:400px){
  .summary-cards{grid-template-columns:1fr;}
  .navbar-tabs .tab-btn{padding:4px 6px;}
  .card-value{font-size:16px;}
  .split-grid{grid-template-columns:1fr;}
  .demo-btns{flex-direction:column;}
  .demo-btn{width:100%;text-align:center;}
}
`;

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
function AppContent() {
  const {user,activeTab}=useApp();

  useEffect(()=>{
    const tag=document.createElement("style");
    tag.textContent=CSS;
    document.head.appendChild(tag);
    return ()=>document.head.removeChild(tag);
  },[]);

  if(!user) return <LoginPage/>;

  return (
    <div className="app">
      {/* Glassmorphism ambient blobs on main pages too */}
      <div className="glass-blob blob1"/>
      <div className="glass-blob blob2"/>
      <div className="glass-blob blob3"/>
      <Navbar/>
      <main className="main-content">
        {activeTab==="dashboard"    && <Dashboard/>}
        {activeTab==="transactions" && <Transactions/>}
        {activeTab==="insights"     && <Insights/>}
        {activeTab==="split"        && <SmartSplitView/>}
      </main>
    </div>
  );
}

export default function App() {
  return <AppProvider><AppContent/></AppProvider>;
}
