import React, { createContext, useContext, useState, useEffect } from "react";

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────
const CATEGORIES = ["Food & Dining","Transport","Shopping","Entertainment","Health","Utilities","Salary","Freelance","Investment","Rent"];
const CATEGORY_COLORS = {
  "Food & Dining":"#FF6B6B", Transport:"#4ECDC4", Shopping:"#FFE66D",
  Entertainment:"#A29BFE", Health:"#6BCB77", Utilities:"#FD7F6F",
  Salary:"#00B4D8", Freelance:"#48CAE4", Investment:"#74C69D", Rent:"#F4A261",
};

const PERSONAS = {
  admin:  { avatar:"AV", name:"Admin",   title:"Finance Admin",    color:"#f59e0b" },
  viewer: { avatar:"RS", name:"Rahul Sharma",  title:"Read-Only Viewer", color:"#a78bfa" },
};

const INITIAL_TXS = [
  { id:1,  date:"2026-03-01", description:"Salary Credit",      category:"Salary",        amount:85000, type:"income"  },
  { id:2,  date:"2026-03-02", description:"Swiggy Order",       category:"Food & Dining",  amount:450,   type:"expense" },
  { id:3,  date:"2026-03-03", description:"Uber Ride",          category:"Transport",      amount:220,   type:"expense" },
  { id:4,  date:"2026-03-05", description:"Amazon Shopping",    category:"Shopping",       amount:3200,  type:"expense" },
  { id:5,  date:"2026-03-06", description:"Netflix",            category:"Entertainment",  amount:649,   type:"expense" },
];

const SPLIT_RULES = [
  { cats:["Rent"],                           bucket:"Fixed",    label:"Fixed Costs",    color:"#6366f1", advice:"Recurring obligations." },
  { cats:["Salary","Freelance","Investment"], bucket:"Income",   label:"Income/Returns", color:"#22c55e", advice:"Keep growing this." },
  { cats:["Utilities"],                      bucket:"Utility",  label:"Utilities",      color:"#FD7F6F", advice:"Review plans to save." },
  { cats:["Food & Dining"],                  bucket:"Food",     label:"Food & Dining",  color:"#FF6B6B", advice:"Small cuts add up fast." },
  { cats:["Transport"],                      bucket:"Mobility", label:"Transport",      color:"#4ECDC4", advice:"Consider monthly passes." },
  { cats:["Health"],                         bucket:"Health",   label:"Health",         color:"#6BCB77", advice:"Essential — prioritise." },
  { cats:["Shopping","Entertainment"],       bucket:"Lifestyle",label:"Lifestyle",      color:"#A29BFE", advice:"Most flexible to trim." },
];

const DONUT_COLORS = ["#e97b8b","#f0a0a8","#c7556a","#f4c0c5","#b84560","#e8909a","#f7d4d7"];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const fmt     = (n) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
const fmtK    = (n) => n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:`${n}`;
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
const getBucket = (cat) => SPLIT_RULES.find(r=>r.cats.includes(cat)) || { bucket:"Other", label:"Other", color:"#aaa", advice:"" };

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────
const Ctx = createContext();
const useApp = () => useContext(Ctx);

function AppProvider({ children }) {
  const load = (key, fb) => { try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; } };
  
  const [role, setRole] = useState(() => load("fin_role", "admin"));
  const [transactions, setTransactions] = useState(() => load("fin_txs", INITIAL_TXS));
  const [isDark, setIsDark] = useState(() => load("fin_theme", true)); // Added Theme State
  const [filters, setFilters] = useState({ search: "", type: "all", category: "all", month: "all" });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { localStorage.setItem("fin_txs", JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem("fin_role", JSON.stringify(role)); }, [role]);
  useEffect(() => { localStorage.setItem("fin_theme", JSON.stringify(isDark)); }, [isDark]); // Save Theme preference

  const addTransaction = (tx) => setTransactions(p => [{ ...tx, id: Date.now() }, ...p]);
  const editTransaction = (id, up) => setTransactions(p => p.map(t => t.id === id ? { ...t, ...up } : t));
  const deleteTransaction = (id) => setTransactions(p => p.filter(t => t.id !== id));

  const filteredTransactions = transactions.filter(t => {
    const s = filters.search.toLowerCase();
    return (!s || t.description.toLowerCase().includes(s) || t.category.toLowerCase().includes(s))
      && (filters.type === "all" || t.type === filters.type)
      && (filters.category === "all" || t.category === filters.category)
      && (filters.month === "all" || t.date.startsWith(filters.month));
  });

  return (
    <Ctx.Provider value={{
      role, setRole,
      isDark, setIsDark, // Added to context
      user: { ...PERSONAS[role], role },
      transactions, filteredTransactions,
      filters, setFilters,
      activeTab, setActiveTab,
      sidebarOpen, setSidebarOpen,
      addTransaction, editTransaction, deleteTransaction,
    }}>
      {children}
    </Ctx.Provider>
  );
}

// ─────────────────────────────────────────────
// SPARKLINE
// ─────────────────────────────────────────────
function Sparkline({ values=[], color="#fff", width=68, height=26 }) {
  if(values.length<2) return null;
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const xs=values.map((_,i)=>(i/(values.length-1))*width);
  const ys=values.map(v=>height-3-((v-min)/range)*(height-6));
  const pts=xs.map((x,i)=>`${x},${ys[i]}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{width,height,display:"block",opacity:.75,flexShrink:0}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="2.5" fill={color}/>
    </svg>
  );
}

// ─────────────────────────────────────────────
// ROLE SWITCHER
// ─────────────────────────────────────────────
function RoleSwitcher() {
  const { role, setRole } = useApp();
  return (
    <div className="role-sw">
      <div className="role-sw-label">Demo Role</div>
      <div className="role-pills">
        <button className={`rpill ${role==="admin"?"rpill-on":""}`} onClick={()=>setRole("admin")}>
          <span className="rpill-dot" style={{background:"#f59e0b"}}/>Admin
        </button>
        <button className={`rpill ${role==="viewer"?"rpill-on":""}`} onClick={()=>setRole("viewer")}>
          <span className="rpill-dot" style={{background:"#a78bfa"}}/>Viewer
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
const NAV = [
  { id:"dashboard",    icon:"▦",  label:"Dashboard"    },
  { id:"transactions", icon:"⇅",  label:"Transactions" },
  { id:"insights",     icon:"◉",  label:"Insights"     },
];

function Sidebar() {
  const { activeTab, setActiveTab, user, sidebarOpen, setSidebarOpen, isDark, setIsDark } = useApp();
  const p = PERSONAS[user.role];
  const go = (id) => { setActiveTab(id); setSidebarOpen(false); };

  return (
    <>
      {sidebarOpen && <div className="sb-ov" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sb-open" : ""}`}>
        <div className="sb-brand">
          <div className="sb-logo">◈</div>
          <div>
            <div className="sb-name">FinFlow</div>
            <div className="sb-sub">Finance Dashboard</div>
          </div>
        </div>

        <div className="sb-user" style={{ borderColor: p.color + "55" }}>
          <div className="sb-av" style={{ background: p.color }}>{p.avatar}</div>
          <div>
            <div className="sb-uname">{p.name}</div>
            <div className="sb-utitle" style={{ color: p.color }}>{p.title}</div>
          </div>
        </div>

        {/* THEME SWITCHER */}
        <div className="theme-sw" onClick={() => setIsDark(!isDark)}>
          <div className="tsw-lbl">{isDark ? "🌙 Dark Mode" : "☀️ Light Mode"}</div>
          <div className={`tsw-track ${isDark ? 'tsw-on' : ''}`}>
            <div className="tsw-thumb" />
          </div>
        </div>

        <RoleSwitcher />

        <nav className="sb-nav">
          {NAV.map(n => (
            <button key={n.id} className={`sb-item ${activeTab === n.id ? "sb-active" : ""}`} onClick={() => go(n.id)}>
              <span className="sb-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────
// TOPBAR + BOTTOM NAV (mobile)
// ─────────────────────────────────────────────
function TopBar() {
  const { setSidebarOpen, activeTab } = useApp();
  const cur = NAV.find(n=>n.id===activeTab);
  return (
    <header className="topbar">
      <button className="hbg" onClick={()=>setSidebarOpen(o=>!o)}><span/><span/><span/></button>
      <div className="tb-title"><span>{cur?.icon}</span>{cur?.label}</div>
      <div style={{width:36}}/>
    </header>
  );
}
function BottomNav() {
  const { activeTab, setActiveTab } = useApp();
  return (
    <nav className="bnav">
      {NAV.map(n=>(
        <button key={n.id} className={`bn-item ${activeTab===n.id?"bn-on":""}`} onClick={()=>setActiveTab(n.id)}>
          <span className="bn-icon">{n.icon}</span>
          <span className="bn-label">{n.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD — Xero style
// ─────────────────────────────────────────────
function Dashboard() {

  const { transactions } = useApp();

  const { income, expense, balance } = getSummary(transactions);

  const byCategory = groupByCategory(transactions);

  const monthly    = getMonthlyData(transactions);

  const top5       = byCategory.slice(0,5);

  const barMax     = top5[0]?.[1]||1;

  const donutTotal = top5.reduce((s,[,v])=>s+v,0);

  const [hovSlice, setHovSlice] = useState(null);



  const cx=90,cy=90,R=78,inner=44;

  const ang2xy=(a,rad)=>({x:cx+rad*Math.cos(((a-90)*Math.PI)/180),y:cy+rad*Math.sin(((a-90)*Math.PI)/180)});

  let ang=0;

  const slices=top5.map(([cat,val],i)=>{

    const sw=(val/donutTotal)*360,s=ang,e=ang+sw; ang+=sw;

    return {cat,val,s,e,color:DONUT_COLORS[i%DONUT_COLORS.length]};

  });



  const incSpk=monthly.map(m=>m.income);

  const expSpk=monthly.map(m=>m.expense);

  const balSpk=monthly.map(m=>m.balance);



  const kpis=[

    { label:"Total Income",      value:income,     sub:"", bg:"linear-gradient(135deg,#1a73a7,#165e88)", spk:incSpk },

    { label:"Total Expenses",    value:expense,    sub:"", bg:"linear-gradient(135deg,#0e9e8e,#0b7d73)", spk:expSpk },

    { label:"Expenses 30+ days", value:expense*.70,sub:"", bg:"linear-gradient(135deg,#38b2ac,#2d9595)", spk:expSpk },

    { label:"Net Balance",       value:balance,    sub:"", bg:"linear-gradient(135deg,#6c63b8,#524caa)", spk:balSpk },

  ];



  const recentAll=[...transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);



  return (

    <div className="dash">

      {/* Header */}

     

      <div className="dash-hd">

        <div className="dh-left"><div className="dh-title">Finance Dashboard</div><div className="dh-sub">Personal Finance </div></div>

      </div>



      {/* KPI row */}

      <div className="kpi-row">

        {kpis.map((k,i)=>(

          <div key={i} className="kpi-card" style={{background:k.bg}}>

            <div className="kpi-label">{k.label}</div>

            <div className="kpi-value">{k.value<0?"-":""}{fmtK(Math.abs(k.value))}</div>

            <div className="kpi-foot"><span className="kpi-sub">{k.sub}</span><Sparkline values={k.spk} color="#fff" width={60} height={24}/></div>

          </div>

        ))}

      </div>



      {/* Charts */}

      <div className="charts-row">

        {/* Horizontal bar */}

        <div className="cbox">

          <div className="cbox-title">Expenses by Category <span className="cbox-sub"></span></div>

          <div className="bar-chart">

            {top5.map(([cat,val])=>(

              <div key={cat} className="bc-row">

                <div className="bc-lbl">{cat}</div>

                <div className="bc-track"><div className="bc-fill" style={{width:`${(val/barMax)*100}%`,background:CATEGORY_COLORS[cat]||"#4ECDC4"}}/></div>

                <div className="bc-val">{fmtK(val)}</div>

              </div>

            ))}

          </div>

        </div>

       



        {/* Donut */}

        <div className="cbox">

          <div className="cbox-title">Spending Share</div>

          <div className="donut-wrap">

            <svg viewBox="0 0 180 180" className="donut-svg">

              {slices.map(({cat,s,e,color})=>{

                const lg=e-s>180?1:0;

                const sp=ang2xy(s,R),ep=ang2xy(e,R),si=ang2xy(s,inner),ei=ang2xy(e,inner);

                return (

                  <path key={cat}

                    d={`M ${sp.x} ${sp.y} A ${R} ${R} 0 ${lg} 1 ${ep.x} ${ep.y} L ${ei.x} ${ei.y} A ${inner} ${inner} 0 ${lg} 0 ${si.x} ${si.y} Z`}

                    fill={color} opacity={hovSlice===null||hovSlice===cat?1:0.4}

                    style={{cursor:"pointer",transition:"opacity .2s"}}

                    onMouseEnter={()=>setHovSlice(cat)} onMouseLeave={()=>setHovSlice(null)}

                  />

                );

              })}

              <text x={cx} y={cy-6}  textAnchor="middle" className="dc-lbl">{hovSlice?hovSlice.split(" ")[0]:"Total"}</text>

              <text x={cx} y={cy+12} textAnchor="middle" className="dc-val">{hovSlice?fmtK(top5.find(([c])=>c===hovSlice)?.[1]||0):fmtK(donutTotal)}</text>

            </svg>

            <div className="dl-list">

              {slices.map(({cat,val,color})=>(

                <div key={cat} className="dl-row"

                  style={{opacity:hovSlice===null||hovSlice===cat?1:0.45,cursor:"pointer"}}

                  onMouseEnter={()=>setHovSlice(cat)} onMouseLeave={()=>setHovSlice(null)}>

                  <span className="dl-dot" style={{background:color}}/>

                  <span className="dl-cat">{cat}</span>

                  <span className="dl-pct">{Math.round((val/donutTotal)*100)}%</span>

                </div>

              ))}

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}
// ─────────────────────────────────────────────
// TRANSACTIONS
// ─────────────────────────────────────────────
const MONTH_OPTS=[{val:"all",label:"All Months"},{val:"2026-03",label:"March 2026"},{val:"2026-02",label:"February 2026"},{val:"2026-01",label:"January 2026"}];
const EMPTY={date:"",description:"",category:CATEGORIES[0],amount:"",type:"expense"};

function TxModal({tx,onClose}) {
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
    <div className="modal-ov" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-hd"><span>{tx?"Edit Transaction":"Add Transaction"}</span><button className="modal-x" onClick={onClose}>✕</button></div>
        {err&&<div className="modal-err">{err}</div>}
        <div className="modal-body">
          <label>Date<input type="date" value={form.date} onChange={e=>set("date",e.target.value)}/></label>
          <label>Description<input type="text" placeholder="e.g. Salary Credit" value={form.description} onChange={e=>set("description",e.target.value)}/></label>
          <label>Amount (₹)<input type="number" min="1" value={form.amount} onChange={e=>set("amount",e.target.value)}/></label>
          <label>Category<select value={form.category} onChange={e=>set("category",e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
          <label>Type<select value={form.type} onChange={e=>set("type",e.target.value)}><option value="income">Income</option><option value="expense">Expense</option></select></label>
        </div>
        <div className="modal-ft">
          <button className="btn-sec" onClick={onClose}>Cancel</button>
          <button className="btn-pri" onClick={submit}>{tx?"Save Changes":"Add"}</button>
        </div>
      </div>
    </div>
  );
}

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
  const toggleSort=(k)=>{ if(sortKey===k)setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortKey(k);setSortDir("asc");} };
  const exportCSV=()=>{
    const rows=[["Date","Description","Category","Type","Amount"]];
    sorted.forEach(t=>rows.push([t.date,t.description,t.category,t.type,t.amount]));
    const a=document.createElement("a");
    a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(rows.map(r=>r.join(",")).join("\n"));
    a.download="transactions.csv"; a.click();
  };
  return (
    <div className="page-sec">
      <div className="pg-hd-band">
        <div><div className="pg-title">Transactions</div><div className="pg-sub">All financial records</div></div>
        <div className="pg-acts">
          {role==="admin"&&<button className="btn-pri" onClick={()=>setModal(false)}>+ Add Transaction</button>}
          <button className="btn-sec" onClick={exportCSV}>↓ Export CSV</button>
        </div>
      </div>
      <div className="filters-row">
        <input className="f-inp" placeholder="🔍 Search transactions…" value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))}/>
        <select className="f-sel" value={filters.type} onChange={e=>setFilters(f=>({...f,type:e.target.value}))}>
          <option value="all">All Types</option><option value="income">Income</option><option value="expense">Expense</option>
        </select>
        <select className="f-sel" value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}>
          <option value="all">All Categories</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <select className="f-sel" value={filters.month} onChange={e=>setFilters(f=>({...f,month:e.target.value}))}>
          {MONTH_OPTS.map(m=><option key={m.val} value={m.val}>{m.label}</option>)}
        </select>
      </div>
      {sorted.length===0
        ?<div className="empty-st">No transactions match your filters.</div>
        :<div className="tbl-box" style={{padding:0}}>
          <div className="tbl-scroll">
            <table className="xtbl xtbl-full">
              <thead><tr>
                {[["date","Date"],["description","Description"],["category","Category"],["type","Type"],["amount","Amount"]].map(([k,l])=>(
                  <th key={k} onClick={()=>toggleSort(k)} style={{cursor:"pointer",userSelect:"none",whiteSpace:"nowrap"}}>
                    {l} {sortKey===k?(sortDir==="asc"?"↑":"↓"):"⇅"}
                  </th>
                ))}
                {role==="admin"&&<th>Actions</th>}
              </tr></thead>
              <tbody>
                {sorted.map(t=>(
                  <tr key={t.id}>
                    <td className="tx-date">{fmtDate(t.date)}</td>
                    <td className="tx-desc">{t.description}</td>
                    <td><span className="cat-pill" style={{background:(CATEGORY_COLORS[t.category]||"#aaa")+"22",color:CATEGORY_COLORS[t.category]||"#aaa"}}>{t.category}</span></td>
                    <td><span className={`type-pill tp-${t.type}`}>{t.type}</span></td>
                    <td className={t.type==="income"?"a-pos":"a-neg"} style={{fontFamily:"var(--mono)",fontWeight:700}}>{t.type==="income"?"+":"-"}{fmt(t.amount)}</td>
                    {role==="admin"&&<td><div style={{display:"flex",gap:6}}>
                      <button className="btn-edit" onClick={()=>setModal(t)}>✎</button>
                      <button className="btn-del" onClick={()=>deleteTransaction(t.id)}>✕</button>
                    </div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }
      {modal!==null&&<TxModal tx={modal||null} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ─────────────────────────────────────────────
// INSIGHTS
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
    <div className="page-sec">
      <div className="pg-hd-band">
        <div><div className="pg-title">Insights</div><div className="pg-sub">Financial analysis & trends</div></div>
      </div>
      <div className="ins-kpi-row">
        {[
          {icon:"🔥",label:"Top Spending",value:topCat?topCat[0]:"—",sub:topCat?`${fmt(topCat[1])} · ${Math.round((topCat[1]/totalExp)*100)}%`:"No data",accent:topCat?CATEGORY_COLORS[topCat[0]]:"#ccc"},
          {icon:"💰",label:"Savings Rate",value:income>0?`${Math.round(((income-expense)/income)*100)}%`:"—",sub:"of income retained",accent:"#0fa968"},
          {icon:"📅",label:"Monthly Change",value:curr&&prev?`${curr.expense>prev.expense?"▲":"▼"}${Math.abs(Math.round(((curr.expense-prev.expense)/prev.expense)*100))}%`:"—",sub:curr&&prev?(curr.expense>prev.expense?"More vs last month":"Less vs last month"):"",accent:curr&&prev&&curr.expense>prev.expense?"#d93025":"#0fa968"},
        ].map((c,i)=>(
          <div key={i} className="ins-kpi-card" style={{borderTop:`3px solid ${c.accent}`}}>
            <div style={{fontSize:22}}>{c.icon}</div>
            <div>
              <div className="ik-lbl">{c.label}</div>
              <div className="ik-val" style={{color:c.accent}}>{c.value}</div>
              <div className="ik-sub">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="ins-row">
        <div className="tbl-box">
          <div className="tbl-title">Category Breakdown</div>
          <div className="bar-chart">
            {byCategory.slice(0,6).map(([cat,val])=>(
              <div key={cat} className="bc-row">
                <div className="bc-lbl">{cat}</div>
                <div className="bc-track"><div className="bc-fill" style={{width:`${Math.round((val/byCategory[0][1])*100)}%`,background:CATEGORY_COLORS[cat]||"#4ECDC4"}}/></div>
                <div className="bc-val">{fmt(val)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="tbl-box">
          <div className="tbl-title">Monthly Comparison</div>
          <div className="tbl-scroll">
            <table className="xtbl">
              <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead>
              <tbody>
                {monthly.map(m=>(
                  <tr key={m.month}>
                    <td>{new Date(m.month+"-01").toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</td>
                    <td className="a-pos">+{fmt(m.income)}</td>
                    <td className="a-neg">-{fmt(m.expense)}</td>
                    <td><span className={`net-chip ${m.balance>=0?"nc-pos":"nc-neg"}`}>{fmt(m.balance)}</span></td>
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
// CSS
// ─────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* Update the start of your CSS string */
:root {
  /* Default DARK Theme */
  --bg: #0b0f19; --bg2: #161b26; --bg3: #242b3d; --border: #2d3548;
  --text: #f3f4f6; --text2: #9ca3af;
  --green: #10b981; --red: #ef4444;
  --font: 'Plus Jakarta Sans', sans-serif; --mono: 'JetBrains Mono', monospace;
  --sb-w: 220px; --sb-bg: #0f172a; --sb-text: #94a3b8; --sb-accent: #3b82f6;
  --topbar-h: 52px; --bnav-h: 62px; --r: 10px;
}

.light-theme {
  /* LIGHT Theme Overrides */
  --bg: #f0f2f5; --bg2: #ffffff; --bg3: #e8eaed; --border: #e2e5ea;
  --text: #1d2130; --text2: #6b7280;
  --sb-bg: #0f1d36;
}

/* Add these new Switch styles to your CSS */
.theme-sw { 
  margin: 12px 12px 0; padding: 10px; background: rgba(255,255,255,.04); 
  border-radius: 8px; display: flex; align-items: center; justify-content: space-between; 
  cursor: pointer; border: 1px solid rgba(255,255,255,0.05);
}
.tsw-lbl { font-size: 11px; font-weight: 700; color: #fff; }
.tsw-track { width: 32px; height: 16px; background: #334155; border-radius: 10px; position: relative; transition: .3s; }
.tsw-on { background: var(--sb-accent); }
.tsw-thumb { width: 12px; height: 12px; background: #fff; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: .3s; }
.tsw-on .tsw-thumb { left: 18px; }

/* Important: Make sure these components use the variables */
body, .app { background: var(--bg); color: var(--text); transition: background .3s; }
.cbox, .tbl-box, .ins-kpi-card, .modal-box, .f-inp, .f-sel, .btn-sec, .btn-edit { 
  background: var(--bg2) !important; 
  color: var(--text) !important; 
  border-color: var(--border) !important; 
}
.dc-val { fill: var(--text) !important; }
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;overflow-x:hidden;}

/* SHELL */
.app{display:flex;min-height:100vh;}

/* SIDEBAR */
.sidebar{
  width:var(--sb-w);position:fixed;top:0;left:0;bottom:0;z-index:200;
  background:var(--sb-bg);color:var(--sb-text);
  display:flex;flex-direction:column;
  transition:transform .26s cubic-bezier(.4,0,.2,1);
  overflow-y:auto;
}
.sb-ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:199;}
.sb-brand{display:flex;align-items:center;gap:12px;padding:20px 16px 18px;border-bottom:1px solid rgba(255,255,255,.06);}
.sb-logo{width:36px;height:36px;border-radius:9px;background:var(--sb-accent);display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;font-weight:900;flex-shrink:0;}
.sb-name{font-size:16px;font-weight:800;color:#fff;}
.sb-sub{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.6px;margin-top:1px;}
.sb-user{margin:12px 12px 0;border-radius:8px;border:1px solid;padding:10px 12px;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.04);}
.sb-av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0;}
.sb-uname{font-size:13px;font-weight:700;color:#fff;}
.sb-utitle{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-top:1px;}

/* ROLE SWITCHER */
.role-sw{display:flex;flex-direction:column;gap:6px;margin:12px 12px 0;padding:10px;background:rgba(255,255,255,.04);border-radius:8px;}
.role-sw-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:rgba(255,255,255,.3);}
.role-pills{display:flex;gap:4px;}
.rpill{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:6px 4px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.45);font-family:var(--font);font-size:11px;font-weight:700;cursor:pointer;transition:all .16s;}
.rpill.rpill-on{background:rgba(79,156,249,.2);border-color:rgba(79,156,249,.5);color:#fff;}
.rpill-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}

/* NAV */
.sb-nav{display:flex;flex-direction:column;gap:2px;padding:16px 10px;flex:1;}
.sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;border:none;background:transparent;color:var(--sb-text);font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;transition:all .16s;text-align:left;width:100%;}
.sb-item:hover{background:rgba(255,255,255,.07);color:#fff;}
.sb-item.sb-active{background:var(--sb-accent);color:#fff;box-shadow:0 4px 14px rgba(79,156,249,.35);}
.sb-icon{font-size:15px;width:20px;text-align:center;flex-shrink:0;}

/* TOPBAR */
.topbar{display:none;position:fixed;top:0;left:0;right:0;height:var(--topbar-h);z-index:150;padding:0 14px;align-items:center;justify-content:space-between;background:var(--sb-bg);border-bottom:1px solid rgba(255,255,255,.06);}
.hbg{width:36px;height:36px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;padding:0;}
.hbg span{display:block;width:16px;height:2px;background:#fff;border-radius:2px;}
.tb-title{font-size:15px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px;}

/* BOTTOM NAV */
.bnav{display:none;position:fixed;bottom:0;left:0;right:0;height:var(--bnav-h);z-index:150;padding:0 4px;align-items:center;justify-content:space-around;background:var(--sb-bg);border-top:1px solid rgba(255,255,255,.06);}
.bn-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:6px;border-radius:8px;border:none;background:transparent;color:var(--sb-text);font-family:var(--font);cursor:pointer;transition:all .16s;}
.bn-item.bn-on{color:var(--sb-accent);}
.bn-icon{font-size:17px;}
.bn-label{font-size:10px;font-weight:700;}

/* MAIN */
.main-content{margin-left:var(--sb-w);flex:1;padding:24px;min-width:0;}

/* DASHBOARD */
.dash{display:flex;flex-direction:column;gap:18px;}
.dash-hd{background:linear-gradient(135deg,#0f1d36 0%,#162b58 60%,#1e4ba0 100%);border-radius:var(--r);padding:20px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;}
.dh-title{font-size:20px;font-weight:800;color:#fff;letter-spacing:-.4px;}
.dh-sub{font-size:12px;color:rgba(255,255,255,.45);margin-top:3px;}
.dh-right{display:flex;gap:8px;flex-wrap:wrap;}
.dh-chip{padding:7px 14px;border-radius:7px;background:rgba(255,255,255,.1);color:rgba(255,255,255,.8);font-size:12px;font-weight:600;border:1px solid rgba(255,255,255,.14);cursor:pointer;}

/* KPI */
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.kpi-card{border-radius:var(--r);padding:18px 20px;color:#fff;min-width:0;}
.kpi-label{font-size:11px;font-weight:600;opacity:.8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;}
.kpi-value{font-size:26px;font-weight:800;font-family:var(--mono);letter-spacing:-.5px;margin-bottom:8px;}
.kpi-foot{display:flex;align-items:center;justify-content:space-between;}
.kpi-sub{font-size:11px;opacity:.65;font-style:italic;}

/* CHARTS */
.charts-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.cbox{background:#fff;border-radius:var(--r);padding:20px;border:1px solid var(--border);}
.cbox-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:14px;}
.cbox-sub{font-size:11px;color:var(--text2);font-weight:400;margin-left:6px;}

/* BAR CHART */
.bar-chart{display:flex;flex-direction:column;gap:12px;}
.bc-row{display:flex;align-items:center;gap:10px;}
.bc-lbl{font-size:12px;color:var(--text2);width:108px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.bc-track{flex:1;background:var(--bg3);border-radius:100px;height:9px;overflow:hidden;}
.bc-fill{height:100%;border-radius:100px;transition:width .5s ease;}
.bc-val{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--text);width:48px;text-align:right;flex-shrink:0;}

/* DONUT */
.donut-wrap{display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
.donut-svg{width:180px;flex-shrink:0;}
.dc-lbl{fill:#9ca3af;font-size:10px;font-family:var(--font);font-weight:600;}
.dc-val{fill:#1d2130;font-size:13px;font-family:var(--mono);font-weight:700;}
.dl-list{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0;}
.dl-row{display:flex;align-items:center;gap:8px;padding:3px 4px;border-radius:5px;transition:background .15s;}
.dl-row:hover{background:var(--bg3);}
.dl-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.dl-cat{font-size:12px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dl-pct{font-size:12px;font-family:var(--mono);color:var(--text2);flex-shrink:0;}

/* TABLES ROW */
.tbls-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.tbl-box{background:#fff;border-radius:var(--r);padding:18px;border:1px solid var(--border);}
.tbl-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px;}
.tbl-sub{font-size:11px;color:var(--text2);font-weight:400;margin-left:6px;}
.tbl-scroll{overflow-x:auto;}

/* TABLE */
.xtbl{width:100%;border-collapse:collapse;min-width:280px;}
.xtbl th{text-align:left;padding:8px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text2);border-bottom:2px solid var(--border);white-space:nowrap;}
.xtbl td{padding:9px 10px;font-size:13px;border-bottom:1px solid var(--bg3);}
.xtbl tr:last-child td{border-bottom:none;}
.xtbl tr:hover td{background:#f9fafb;}
.xtbl-full{min-width:480px;}
.sort-col{color:var(--text);}

/* ATOMS */
.tx-date{color:var(--text2);font-size:12px;white-space:nowrap;}
.tx-desc{font-weight:600;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cat-pill{padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;}
.type-pill{padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;text-transform:capitalize;}
.tp-income{background:#d1fae5;color:#065f46;}
.tp-expense{background:#fee2e2;color:#991b1b;}
.a-pos{color:var(--green);font-weight:700;}
.a-neg{color:var(--red);font-weight:700;}
.net-chip{display:inline-block;padding:2px 8px;border-radius:5px;font-size:12px;font-family:var(--mono);font-weight:700;}
.nc-pos{background:#d1fae5;color:#065f46;}
.nc-neg{background:#fee2e2;color:#991b1b;}

/* PAGE SECTIONS */
.page-sec{display:flex;flex-direction:column;gap:16px;}
.pg-hd-band{background:linear-gradient(135deg,#0f1d36 0%,#162b58 60%,#1e4ba0 100%);border-radius:var(--r);padding:18px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;}
.pg-title{font-size:18px;font-weight:800;color:#fff;letter-spacing:-.4px;}
.pg-sub{font-size:12px;color:rgba(255,255,255,.45);margin-top:3px;}
.pg-acts{display:flex;gap:8px;flex-wrap:wrap;}

/* FILTERS */
.filters-row{display:flex;gap:8px;flex-wrap:wrap;}
.f-inp{flex:1;min-width:150px;padding:8px 12px;border-radius:7px;border:1px solid var(--border);background:#fff;color:var(--text);font-family:var(--font);font-size:13px;}
.f-sel{padding:8px 12px;border-radius:7px;border:1px solid var(--border);background:#fff;color:var(--text);font-family:var(--font);font-size:13px;cursor:pointer;}
.f-inp:focus,.f-sel:focus{outline:none;border-color:#4f9cf9;}
.empty-st{text-align:center;padding:60px 20px;color:var(--text2);}

/* BUTTONS */
.btn-pri{padding:8px 16px;border-radius:7px;border:none;background:#1a73e8;color:#fff;font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;transition:opacity .15s;}
.btn-pri:hover{opacity:.88;}
.btn-sec{padding:8px 16px;border-radius:7px;border:1px solid var(--border);background:#fff;color:var(--text);font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;}
.btn-sec:hover{background:var(--bg3);}
.btn-edit{padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text);cursor:pointer;font-size:13px;}
.btn-edit:hover{background:#1a73e8;color:#fff;border-color:#1a73e8;}
.btn-del{padding:4px 10px;border-radius:6px;border:1px solid #fca5a5;background:#fee2e2;color:var(--red);cursor:pointer;font-size:13px;}
.btn-del:hover{background:var(--red);color:#fff;}

/* MODAL */
.modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:400;padding:16px;animation:fadeIn .14s;}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal-box{border-radius:12px;width:420px;max-width:100%;background:#fff;animation:slideUp .17s ease-out;box-shadow:0 20px 60px rgba(0,0,0,.2);}
@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}
.modal-hd{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border);font-size:15px;font-weight:800;}
.modal-x{background:none;border:none;font-size:18px;cursor:pointer;color:var(--text2);}
.modal-x:hover{color:var(--red);}
.modal-err{margin:10px 20px 0;padding:8px 12px;background:#fee2e2;color:var(--red);border-radius:6px;font-size:13px;}
.modal-body{padding:16px 20px;display:flex;flex-direction:column;gap:12px;}
.modal-body label{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text2);}
.modal-body input,.modal-body select{padding:8px 12px;border-radius:7px;border:1px solid var(--border);background:#fff;color:var(--text);font-family:var(--font);font-size:14px;}
.modal-body input:focus,.modal-body select:focus{outline:none;border-color:#4f9cf9;}
.modal-ft{display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid var(--border);}

/* INSIGHTS */
.ins-kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.ins-kpi-card{background:#fff;border-radius:var(--r);border:1px solid var(--border);padding:16px 18px;display:flex;gap:14px;align-items:flex-start;}
.ik-lbl{font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;}
.ik-val{font-size:24px;font-weight:800;font-family:var(--mono);margin-bottom:4px;}
.ik-sub{font-size:12px;color:var(--text2);}
.ins-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}


/* RESPONSIVE */
@media(max-width:1200px){
  .kpi-row{grid-template-columns:1fr 1fr;}
  .kpi-value{font-size:22px;}
}
@media(max-width:1024px){
  .charts-row,.tbls-row,.ins-row{grid-template-columns:1fr;}
  .split-grid{grid-template-columns:1fr 1fr;}
  .ins-kpi-row{grid-template-columns:1fr 1fr;}
  .main-content{padding:18px;}
}
@media(max-width:820px){
  .sidebar{transform:translateX(-100%);}
  .sidebar.sb-open{transform:translateX(0);box-shadow:6px 0 40px rgba(0,0,0,.4);}
  .topbar{display:flex;}
  .bnav{display:flex;}
  .main-content{margin-left:0;padding:calc(var(--topbar-h) + 14px) 14px calc(var(--bnav-h) + 14px);}
  .kpi-row{grid-template-columns:1fr 1fr;gap:10px;}
  .ins-kpi-row{grid-template-columns:1fr;}
}
@media(max-width:560px){
  .kpi-row{gap:8px;}
  .kpi-value{font-size:19px;}
  .kpi-card{padding:14px;}
  .split-grid{grid-template-columns:1fr;}
  .main-content{padding:calc(var(--topbar-h) + 10px) 10px calc(var(--bnav-h) + 10px);}
  .dash-hd,.pg-hd-band{flex-direction:column;align-items:flex-start;}
  .dh-right,.pg-acts{width:100%;}
  .dh-chip{flex:1;text-align:center;}
  .bc-lbl{width:80px;}
  .bc-val{width:40px;font-size:11px;}
}
@media(max-width:380px){
  .kpi-row{grid-template-columns:1fr;}
  .split-grid{grid-template-columns:1fr;}
  .ins-kpi-row{grid-template-columns:1fr;}
}
`;

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
function AppContent() {
  const { activeTab, isDark } = useApp(); // Add isDark here
  
  useEffect(()=>{
    const tag=document.createElement("style");
    tag.id="ff-css"; tag.textContent=CSS;
    document.head.appendChild(tag);
    return ()=>{ const el=document.getElementById("ff-css"); if(el) el.remove(); };
  },[]);

  return (
    /* Add the dynamic class here */
    <div className={`app ${!isDark ? 'light-theme' : ''}`}>
      <Sidebar/>
      <TopBar/>
      <main className="main-content">
        {activeTab==="dashboard"    && <Dashboard/>}
        {activeTab==="transactions" && <Transactions/>}
        {activeTab==="insights"     && <Insights/>}
      </main>
      <BottomNav/>
    </div>
  );
}

export default function App() {
  return <AppProvider><AppContent/></AppProvider>;
}