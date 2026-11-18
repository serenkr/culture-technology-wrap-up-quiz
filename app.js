const main=document.querySelector('main');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
let state;
try{state=JSON.parse(localStorage.getItem('gct501-study-v1'))}catch{}
state ||= {level:0,seen:[[],[],[]],notes:{},run:null,retry:null};
const levels=['초급','중급','고급'];
let saveError=false;
function save(){try{localStorage.setItem('gct501-study-v1',JSON.stringify(state))}catch{saveError=true}}
function navigate(hash){if(location.hash==='#'+hash)render();else location.hash=hash}
const question=id=>BANK.find(q=>q.id===id);
const noteKey=i=>i.level+'-'+i.id;
function available(){return BANK.filter(q=>!state.seen[state.level].includes(q.id))}
function draw(pool,count){
 const groups=shuffle([...new Set(pool.map(q=>q.d))]);
 const result=[];
 for(let i=0;result.length<count;i++){
  const remaining=shuffle(pool.filter(q=>!result.includes(q)));
  if(!remaining.length)break;
  const d=groups[i%groups.length];
  result.push(remaining.find(q=>q.d===d)||remaining[0]);
 }
 return result;
}
function makeRun(){
 const pool=available();
 const mc=pool.filter(q=>q.kind!=='written');
 const written=pool.filter(q=>q.kind==='written');
 if(mc.length<20||written.length<5)return;
 const kinds=['matching','image','concept'];
 const picked=[];
 for(const kind of kinds){
  const candidates=shuffle(mc.filter(q=>q.kind===kind));
  const limits=[[3,1],[2,3],[1,5]][state.level];
  picked.push(...candidates.slice(0,kind==='matching'?limits[0]:kind==='image'?limits[1]:0));
 }
 picked.push(...draw(mc.filter(q=>!picked.includes(q)),20-picked.length));
 const selected=[...shuffle(picked),...shuffle(draw(written,5))];
 state.run={index:0,items:selected.map(q=>({id:q.id,level:state.level,answer:null,options:shuffle([q.answer,...q.wrong])}))};
 state.seen[state.level].push(...selected.map(q=>q.id));
 save();navigate('quiz');
}
function terms(q){
 if(!q.pairs)return '';
 return '<div class="matching"><div>'+q.pairs.map((p,i)=>'<p><b>'+String.fromCharCode(65+i)+'.</b> '+esc(p[0])+'</p>').join('')+'</div><div>'+q.pairs.map((p,i)=>'<p><b>'+(i+1)+'.</b> '+esc(p[1])+'</p>').join('')+'</div></div>';
}
function figure(q){return q.image?'<figure><a href="'+IMAGES[q.image]+'" download="'+q.image+'.jpg" aria-label="슬라이드 이미지 저장"><img src="'+IMAGES[q.image]+'" alt="Original lecture slide for this question"></a><figcaption>Original slide · '+esc(q.source)+' · PDF p. '+q.page+' · 이미지를 눌러 저장</figcaption></figure>':''}
function evidence(q){
 return '<div class="evidence"><b>Lecture reference</b><p>'+esc(q.source)+' · PDF p. '+(q.pages?q.pages.join(', '):q.page)+'</p><blockquote>'+esc(q.quote)+'</blockquote>'+
 (q.pages?'<p>연결 문항의 각 개념은 위 페이지들에서 확인할 수 있습니다. 인용문은 첫 기준 슬라이드의 발췌입니다.</p>':'')+
 (/why|teaching point/i.test(q.stem)?'<p>학습 맥락 설명은 슬라이드의 배치와 내용을 근거로 구성한 해석입니다.</p>':'')+'</div>';
}
function matches(q,answer){const a=answer.normalize('NFKC').toLowerCase();return q.keys.map(group=>group.find(w=>a.includes(w.toLowerCase())))}
function highlight(answer,found){
 const words=found.filter(Boolean).sort((a,b)=>b.length-a.length);
 if(!words.length)return esc(answer);
 const pattern=new RegExp('('+words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','ig');
 return answer.split(pattern).map((part,i)=>i%2?'<mark>'+esc(part)+'</mark>':esc(part)).join('');
}
function feedback(item){
 const q=question(item.id);
 if(q.kind!=='written')return '<section class="feedback" tabindex="-1"><h3>'+(item.correct?'✓ Correct':'✕ Incorrect')+'</h3><p class="key">'+esc(q.term)+'</p><p>'+esc(q.answer)+'</p>'+(item.correct?'':'<p>내 선택 · '+esc(item.answer)+'</p>')+evidence(q)+'</section>';
 const found=matches(q,item.answer);
 return '<section class="feedback" tabindex="-1"><h3>서술형 검토 · '+found.filter(Boolean).length+' / '+q.keys.length+' 핵심 표현 감지</h3><p>한·영 표현을 기준으로 한 점검입니다. 부정 표현, 논리와 사례의 정확성은 모범답안과 비교하세요.</p><h4>내 답안</h4><p class="answer">'+highlight(item.answer,found)+'</p><ul>'+q.keys.map((g,i)=>'<li>'+(found[i]?'✓ 감지됨':'△ 확인 필요')+' · <span class="key">'+esc(g.join(' / '))+'</span></li>').join('')+'</ul><h4>Model answer</h4><p>'+esc(q.answer)+'</p>'+evidence(q)+'</section>';
}
function submit(item,answer,retry){
 if(item.answer!==null)return;
 const q=question(item.id);item.answer=answer;
 item.correct=q.kind==='written'?matches(q,answer).every(Boolean):q.answer===answer;
 if(!item.correct&&(!retry||state.notes[noteKey(item)]))state.notes[noteKey(item)]={...item};
 save();render();main.querySelector('.feedback')?.focus();
}
function home(){
 const pool=available(),mc=pool.filter(q=>q.kind!=='written').length,wr=pool.length-mc;
 const active=state.run&&state.run.index<state.run.items.length;
 main.innerHTML='<p class="eyebrow">GCT501 · Introduction to Culture Technology</p><h1>Culture Technology<br>Practice Exam</h1><p>강의 원문 표현과 실제 슬라이드로 복습하는 영어 퀴즈</p><section><h2>난이도</h2><div class="levels">'+levels.map((l,i)=>'<button data-level="'+i+'" aria-pressed="'+(state.level===i)+'">'+l+'</button>').join('')+'</div><p>'+['용어·인물 연결과 시각 자료 식별을 중심으로 풉니다.','연결·시각 자료·개념 문항을 함께 풉니다.','이미지·그래프 해석의 비중을 높여 복습하고, 서술형에서는 비교와 근거 설명을 연습합니다.'][state.level]+'</p><p>객관식 20 + 주관식·논술형 5 · 미출제 객관식 '+mc+' / 서술형 '+wr+'</p><button class="primary" id="start" '+(active||mc<20||wr<5?'disabled':'')+'>새 세트 시작</button> '+(active?'<a href="#quiz">진행 중인 세트 이어 풀기</a>':'')+((mc<20||wr<5)&&!active?'<button id="reset">출제 기록 초기화</button>':'')+'<p class="small">같은 난이도에서는 주제를 반복 출제하지 않습니다. 난이도별로 연결·이미지 해석 문항의 비중을 조절하며 문항 은행을 공유합니다. 출제 기록을 초기화하면 같은 문제를 다시 풀 수 있습니다.</p></section><section><h2>출제 구성</h2><p>A–E / 1–5 연결 · 개념 설명 · 원본 슬라이드 해석 · 사례의 수업 맥락 · 그래프 축 읽기 · 비교 논술</p><p class="small">이 사이트는 접근 가능한 GCT501 강의 PDF 10개와 강의노트 1개를 바탕으로 구성되었습니다.</p></section>';
 main.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{state.level=+b.dataset.level;save();render()});
 main.querySelector('#start').onclick=makeRun;
 const reset=main.querySelector('#reset');if(reset)reset.onclick=()=>{state.seen[state.level]=[];save();render()};
}
function quiz(retry=false){
 const run=retry?state.retry:state.run;
 if(!run){home();return}
 if(run.index>=run.items.length){
  const mc=run.items.filter(i=>question(i.id).kind!=='written');
  const wr=run.items.filter(i=>question(i.id).kind==='written');
  main.innerHTML='<section><h1>'+ (retry?'오답 퀴즈':'세트')+' 완료</h1><p>객관식 '+mc.filter(i=>i.correct).length+' / '+mc.length+' 정답</p><p>서술형 '+wr.filter(i=>i.correct).length+' / '+wr.length+' 문항에서 모든 핵심 표현 감지</p><a href="#home">새 세트</a> · <a href="#review">오답 노트</a></section>';return;
 }
 const item=run.items[run.index],q=question(item.id),done=item.answer!==null;
 main.innerHTML='<section class="paper"><div class="masthead"><b>GCT501 · CULTURE TECHNOLOGY</b><span>'+levels[item.level]+' · '+(retry?'REVIEW':'PRACTICE')+'</span></div><p class="counter">QUESTION '+(run.index+1)+' / '+run.items.length+' · '+q.kind.toUpperCase()+'</p><progress value="'+(run.index+Number(done))+'" max="'+run.items.length+'" aria-label="진행률"></progress><h2 lang="en">'+esc(q.stem)+'</h2>'+terms(q)+figure(q)+
 (q.kind==='written'?(done?'':'<form><label for="answer">한국어 또는 영어로 답변</label><textarea id="answer" required maxlength="8000"></textarea><button class="primary">제출</button></form>'):'<div class="options">'+item.options.map((option,i)=>'<button data-option="'+i+'" '+(done?'disabled':'')+' class="'+(done&&option===q.answer?'correct':done&&option===item.answer?'wrong':'')+'"><span>'+String.fromCharCode(65+i)+'</span>'+esc(option)+'</button>').join('')+'</div>')+(done?feedback(item)+'<button id="next" class="primary">'+(run.index===run.items.length-1?'결과 보기':'다음 문제')+'</button>':'')+'</section>';
 main.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>submit(item,item.options[+b.dataset.option],retry));
 const form=main.querySelector('form');if(form)form.onsubmit=e=>{e.preventDefault();const text=form.querySelector('textarea').value.trim();if(text)submit(item,text,retry)};
 const next=main.querySelector('#next');if(next)next.onclick=()=>{run.index++;save();render();window.scrollTo(0,0)};
}
function review(){
 const entries=Object.entries(state.notes).reverse();
 main.innerHTML='<h1>오답 노트</h1><p>'+entries.length+'개 문항</p>'+entries.map(([key,i])=>{const q=question(i.id);return '<article><div class="row"><h2 class="key">'+esc(q.term)+'</h2><button data-delete="'+key+'">삭제</button></div><details><summary>문제와 해설 보기</summary><p>'+esc(q.stem)+'</p>'+terms(q)+figure(q)+feedback(i)+'</details></article>'}).join('')+'<section><h2>오답 퀴즈</h2><p>현재 남아 있는 문제만 무작위로 다시 풉니다. 다시 맞혀도 직접 삭제할 때까지 남습니다.</p><button id="retry" class="primary" '+(entries.length?'':'disabled')+'>오답 퀴즈 시작</button>'+(state.retry&&state.retry.index<state.retry.items.length?' <a href="#retry">이어 풀기</a>':'')+'</section>';
 main.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{delete state.notes[b.dataset.delete];save();render()});
 main.querySelector('#retry').onclick=()=>{state.retry={index:0,items:shuffle(entries.map(([,i])=>({...i,answer:null,correct:undefined,options:shuffle(i.options)})))};save();navigate('retry')};
}
function sources(){
 const list=[...new Set(BANK.map(q=>q.source))];
 main.innerHTML='<h1>출제 자료</h1><p>자료명과 페이지 번호는 해설에서 확인할 수 있습니다. 그림 문항에는 원본 슬라이드 이미지가 포함됩니다.</p>'+list.map(s=>'<article>'+esc(s)+'</article>').join('');
}
function render(){({quiz:()=>quiz(),retry:()=>quiz(true),review,sources}[location.hash.slice(1)]||home)();document.querySelector('#count').textContent=Object.keys(state.notes).length;if(saveError)main.insertAdjacentHTML('afterbegin','<p role="alert">현재 브라우저에서 기록 저장을 사용할 수 없습니다.</p>')}
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0)});
render();
