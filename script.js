// Centralised starting-price configuration. Values are retained from the supplied website;
// tournament prices remain quote-on-request until an official tournament price list is provided.
const rankGroups=["Bronze","Silver","Gold","Plat","Diamond","Champ","GC"];
// SSL is a single rank: it has no numbered tiers (SSL 1/2/3 do not exist).
const rankTiers=[...rankGroups.flatMap(group=>[1,2,3].map(tier=>`${group} ${tier}`)),"SSL"];
const currentRankTiers=rankTiers.filter(rank=>rank!=="SSL");
const defaultPrices={Bronze:1,Silver:2,Gold:5,Plat:7,Diamond:10,Champ:15,GC:20};
let savedPrices={};
try { savedPrices=JSON.parse(localStorage.getItem("rlmPrices")||"{}"); } catch (_) { savedPrices={}; }
let prices={...defaultPrices,...savedPrices};
const byId=id=>document.getElementById(id);
const serviceType=byId("serviceType"),current=byId("currentRank"),target=byId("targetRank"),mode=byId("mode");
const currentDivision=byId("currentDivision"),targetDivision=byId("targetDivision"),platform=byId("platform");
const breakdown=byId("breakdown"),total=byId("total"),serviceNote=byId("serviceNote"),orderBtn=byId("orderBtn");
let quote=null;
const divisions=["I","II","III","IV"];
function fillRankSelect(select,placeholder,availableRanks=rankTiers){
  select.innerHTML=`<option value="">${placeholder}</option>`;
  availableRanks.forEach(rank=>{const option=document.createElement("option");option.value=rank;option.textContent=rank;select.appendChild(option);});
}
fillRankSelect(current,"Choose current rank",currentRankTiers);
fillRankSelect(target,"Choose desired rank",rankTiers);
fillRankSelect(byId("tournamentCurrentRank"),"Choose current rank",currentRankTiers);
fillRankSelect(byId("tournamentTargetRank"),"Choose desired rank",rankTiers);
function position(rank,division){return rankTiers.indexOf(rank)*4+divisions.indexOf(division);}
function calculate(){
  quote=null;
  const special=["netwins","placements","season"].includes(serviceType.value);
  byId("rankFields").hidden=special;
  byId("specialFields").hidden=!special;
  if(special){
    const labels={netwins:["Number of net wins","Net wins requested"],placements:["Number of placement games","Placement games requested"],season:["Reward target","Season rewards target"]};
    byId("specialAmountLabel").firstChild.textContent=labels[serviceType.value][0];
    byId("specialAmount").innerHTML=serviceType.value==="season"?'<option>Bronze</option><option>Silver</option><option>Gold</option><option>Platinum</option><option>Diamond</option><option>Champion</option><option>Grand Champion</option><option>Supersonic Legend</option>':Array.from({length:serviceType.value==="placements"?10:25},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("");
    breakdown.textContent=serviceType.value==="netwins"?"Request the number of net wins you need.":serviceType.value==="placements"?"Request help with your new-season placement matches.":"Choose the rank you want to reach for your season rewards.";
    total.textContent="Quote on request";
    serviceNote.textContent="Your request and final price will be confirmed by the team in Discord.";
    quote={special:serviceType.value,amount:byId("specialAmount").value,details:byId("specialDetails").value,mode:mode.value,platform:platform.value};
    return;
  }
  if(!current.value||!target.value){breakdown.textContent="Select your current and desired ranks and divisions to calculate a quote.";total.textContent="€0.00";return;}
  const start=position(current.value,currentDivision.value),end=position(target.value,targetDivision.value);
  if(start<0||end<=start){breakdown.innerHTML="<b>Your desired rank and division must be higher than your current rank and division.</b>";total.textContent="€0.00";return;}
  let standard=0,rows=[];
  for(let step=start;step<end;step++){
    const tierIndex=Math.floor(step/4),fromTier=rankTiers[tierIndex];
    const group=tierIndex>=rankGroups.length*3?"SSL":rankGroups[Math.floor(tierIndex/3)];
    if(!Object.prototype.hasOwnProperty.call(prices,group)){breakdown.textContent="A price has not been configured for this rank range. Please contact the team.";total.textContent="Quote on request";return;}
    const stepPrice=Number(prices[group])/12;standard+=stepPrice;
    const nextPosition=step+1;
    const toLabel=nextPosition>=rankTiers.length*4?"SSL":(nextPosition%4===0?rankTiers[Math.floor(nextPosition/4)]:fromTier)+" "+divisions[nextPosition%4];
    rows.push(`<b>${fromTier} ${divisions[step%4]}</b> → <b>${toLabel}</b> · €${stepPrice.toFixed(2)}`);
  }
  const multiplier=serviceType.value==="carry"?2:1,finalPrice=standard*multiplier;
  breakdown.innerHTML=rows.join("<br>")+(multiplier===2?"<hr><b>Duo Boost ×2</b>":"");total.textContent=`€${finalPrice.toFixed(2)}`;
  serviceNote.textContent=multiplier===2?"🎮 Duo Boost: 2× the standard quote.":"🔐 Solo Boost: our booster plays on your account.";
  quote={from:current.value,fromDivision:currentDivision.value,to:target.value,toDivision:targetDivision.value,mode:mode.value,platform:platform.value,service:serviceType.value,standard,price:finalPrice};
}
[serviceType,current,target,mode,currentDivision,targetDivision,platform,byId("specialAmount"),byId("specialDetails")].forEach(el=>el.addEventListener("change",calculate));
byId("specialDetails").addEventListener("input",calculate);
orderBtn.addEventListener("click",async()=>{
  if(!quote){calculate();if(!quote)return;}
  let msg;
  if(quote.special){const names={netwins:"Net Wins",placements:"Placement Games",season:"Season Rewards Boosting"};msg=`ROCKET LEAGUE MARKED ORDER REQUEST\n\nService: ${names[quote.special]}\nRequested amount/target: ${quote.amount}\nGame mode: ${quote.mode}\nPlatform: ${quote.platform}\nAdditional details: ${quote.details||"None"}\nPrice: Quote on request`;
  }else{const service=quote.service==="carry"?"Duo Boost (2×)":"Solo Boost (standard)";msg=`ROCKET LEAGUE MARKED ORDER REQUEST\n\nService: ${service}\nCurrent rank: ${quote.from} Division ${quote.fromDivision}\nDesired rank: ${quote.to} Division ${quote.toDivision}\nGame mode: ${quote.mode}\nPlatform: ${quote.platform}\nQuoted price: €${quote.price.toFixed(2)}\n\nThis is a starting quote. Final details and payment are confirmed in Discord.`;}
  try{await navigator.clipboard.writeText(msg);alert("Order details copied. Paste them into your ROCKET LEAGUE MARKED Discord ticket.");}catch(_){window.prompt("Copy your order details and paste them into your Discord ticket:",msg);}
  window.open("https://discord.gg/JukFPK7x86","_blank","noopener,noreferrer");
});
// Dedicated tournament calculator: prices are deliberately not guessed.
const tournamentService=byId("tournamentService"),winFields=byId("tournamentWinFields"),boostFields=byId("tournamentBoostFields");
const tournamentBreakdown=byId("tournamentBreakdown"),tournamentTotal=byId("tournamentTotal"),tournamentNote=byId("tournamentNote");
function updateTournamentFields(){
  const isBoost=tournamentService.value==="boost";
  winFields.hidden=isBoost;boostFields.hidden=!isBoost;
  tournamentBreakdown.textContent=isBoost?"Choose your current and desired tournament ranks and divisions.":"Choose how many tournament wins you want to order.";
  tournamentTotal.textContent="Quote on request";
  tournamentNote.textContent=isBoost?"📈 Tournament Boost: get boosted to a higher tournament rank. Price confirmed in Discord.":"🏆 Tournament Win: price and tournament details confirmed in Discord.";
}
tournamentService.addEventListener("change",updateTournamentFields);
byId("tournamentOrderBtn").addEventListener("click",()=>{
  const service=tournamentService.value;
  let details="";
  if(service==="boost"){
    const from=byId("tournamentCurrentRank").value,to=byId("tournamentTargetRank").value;
    const fromDiv=byId("tournamentCurrentDivision").value,toDiv=byId("tournamentTargetDivision").value;
    if(!from||!to){tournamentBreakdown.textContent="Please select both your current and desired tournament ranks.";return;}
    if(position(to,toDiv)<=position(from,fromDiv)){tournamentBreakdown.textContent="Your desired tournament rank and division must be higher than your current one.";return;}
    details=`Current tournament rank: ${from} Division ${fromDiv}\nDesired tournament rank: ${to} Division ${toDiv}`;
  }else{
    details=`Tournament wins requested: ${byId("tournamentWins").value}`;
  }
  const msg=`ROCKET LEAGUE MARKED TOURNAMENT ORDER REQUEST\n\nService: ${service==="win"?"Tournament Win":"Tournament Boost"}\n${details}\nPlatform: ${byId("tournamentPlatform").value}\nPrice: Quote on request — confirm with the team in Discord.`;
  try{navigator.clipboard.writeText(msg).then(()=>alert("Tournament order details copied. Paste them into your ROCKET LEAGUE MARKED Discord ticket.")).catch(()=>window.prompt("Copy your tournament order details:",msg));}
  catch(_){window.prompt("Copy your tournament order details:",msg);}
  window.open("https://discord.gg/JukFPK7x86","_blank","noopener,noreferrer");
});


// Dedicated coaching quote request calculator (prices confirmed by the team).
byId("coachingOrderBtn").addEventListener("click",()=>{
 const msg=`ROCKET LEAGUE MARKED COACHING REQUEST\n\nFormat: ${byId("coachingFormat").value.trim()}\nDuration: ${byId("coachingDuration").value}\nGame mode: ${byId("coachingMode").value}\nCurrent rank: ${byId("coachingRank").value}\nMain goal: ${byId("coachingGoal").value}\nPlatform: ${byId("coachingPlatform").value}\nPrice: Quote on request`;
 try{navigator.clipboard.writeText(msg).then(()=>alert("Coaching request copied. Paste it into your Discord ticket.")).catch(()=>window.prompt("Copy your coaching request:",msg));}catch(_){window.prompt("Copy your coaching request:",msg);}
 window.open("https://discord.gg/JukFPK7x86","_blank","noopener,noreferrer");
});

// Mobile navigation
const menuToggle=byId("menuToggle"),mainNav=byId("mainNav");
if(menuToggle&&mainNav){menuToggle.addEventListener("click",()=>{const open=mainNav.classList.toggle("open");menuToggle.setAttribute("aria-expanded",String(open));menuToggle.setAttribute("aria-label",open?"Close navigation":"Open navigation");});mainNav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{mainNav.classList.remove("open");menuToggle.setAttribute("aria-expanded","false");}));}
// Owner price editor: local to this browser only; prices are per broad rank group.
if(new URLSearchParams(location.search).get("admin")==="1"){
 const panel=document.createElement("section");panel.className="section";panel.innerHTML=`<div class="eyebrow">OWNER TOOLS</div><h2>Edit regular rank prices (€)</h2><p>Each price covers the full rank group (all 3 tiers and 4 divisions). Changes are saved in this browser only and do not update Discord or other visitors.</p><div class="cards" id="priceFields"></div><button class="btn" id="savePrices">Save prices</button>`;document.querySelector("main").appendChild(panel);
 const fields=panel.querySelector("#priceFields");Object.keys(defaultPrices).forEach(rank=>{const wrap=document.createElement("label");wrap.textContent=rank+" → next rank group (€)";const input=document.createElement("input");input.type="number";input.min="0";input.step="0.5";input.value=prices[rank];input.dataset.rank=rank;input.style.cssText="background:#080b10;color:white;border:1px solid #333;padding:12px;border-radius:8px";wrap.appendChild(input);fields.appendChild(wrap);});
 panel.querySelector("#savePrices").addEventListener("click",()=>{fields.querySelectorAll("input").forEach(i=>prices[i.dataset.rank]=Math.max(0,Number(i.value)||0));localStorage.setItem("rlmPrices",JSON.stringify(prices));calculate();alert("Prices saved on this device only.");});
}
calculate();updateTournamentFields();
