import json, pathlib, functools, http.server, socketserver, threading
from playwright.sync_api import sync_playwright
H = pathlib.Path('/mnt/user-data/outputs/duedatehq-card')
h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(H))
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8921), h)
threading.Thread(target=srv.serve_forever, daemon=True).start()
items = json.loads((H/'samples.json').read_text()) + json.loads((H/'stress.json').read_text())
R = """async (d)=>{const {renderCard}=await import('./card.js');
 const r=document.getElementById('root'); r.innerHTML='';
 r.appendChild(await renderCard(d)); await document.fonts.ready;
 await new Promise(x=>requestAnimationFrame(()=>requestAnimationFrame(x)));}"""
CHK = """()=>{
 const el=document.querySelector('.ddhq');
 const c=el.querySelector('.ddhq__card');
 const st=el.querySelector('.ddhq__stamp');
 if(!st) return {no:true};
 const s=st.getBoundingClientRect();
 const cr=c.getBoundingClientRect();
 const sel='.ddhq__h,.ddhq__lab,.ddhq__old,.ddhq__newtx,.ddhq__pend,.ddhq__tag,'
   +'.ddhq__tl,.ddhq__tb,.ddhq__rs,.ddhq__rd,.ddhq__more,.ddhq__fl,.ddhq__fr,'
   +'.ddhq__org,.ddhq__why,.ddhq__nid,.ddhq__lvl';
 const hits=[];
 // 用 Range 取真实字形范围，而不是块级元素的整行宽度
 const rects=[];
 document.querySelectorAll(sel).forEach(n=>{
   const w=document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
   let t, any=false;
   while((t=w.nextNode())){
     if(!t.nodeValue.trim()) continue;
     const rg=document.createRange(); rg.selectNodeContents(t);
     for(const r of rg.getClientRects()) if(r.width&&r.height){
       rects.push([n.className.split(' ')[0], r]); any=true; }
   }
   if(!any){ const r=n.getBoundingClientRect();
     if(r.width&&r.height) rects.push([n.className.split(' ')[0], r]); }
 });
 rects.forEach(([cls,r])=>{
   const ox=Math.min(s.right,r.right)-Math.max(s.left,r.left);
   const oy=Math.min(s.bottom,r.bottom)-Math.max(s.top,r.top);
   if(ox>2&&oy>2) hits.push(cls+':'+Math.round(ox)+'x'+Math.round(oy));
 });
 return {hits, inside: s.top>=cr.top-1 && s.bottom<=cr.bottom+1
   && s.left>=cr.left-1 && s.right<=cr.right+1,
   overflow: c.scrollHeight-c.clientHeight};}"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1180,'height':1540})
    pg.goto('http://127.0.0.1:8921/export.html')
    bad=0
    for d in items:
        pg.evaluate(R,d); pg.wait_for_timeout(250)
        r=pg.evaluate(CHK)
        ok = not r.get('hits') and r.get('inside') and r.get('overflow')==0
        bad += 0 if ok else 1
        print(f"{d['id']:22} {'PASS' if ok else 'FAIL'}  "
              f"overlap={r.get('hits') or 'none'}  inCard={r.get('inside')}  of={r.get('overflow')}")
    print('\nfailures:', bad)
    b.close()
srv.shutdown()
