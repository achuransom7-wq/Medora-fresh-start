const http=require('http');
http.createServer((q,r)=>{let b='';q.on('data',d=>b+=d);q.on('end',()=>{
 const j=JSON.parse(b); const sys=j.messages[0].content; const last=j.messages.at(-1).content; const lastL=last.toLowerCase();
 let out='';
 if(sys.startsWith('You write short titles')) out='"Headache and fever."';
 else if(/who are you/.test(lastL)) out="I'm Medora, an AI health companion. I can chat, answer health questions and help you understand symptoms. How are you feeling today?\n[SEVERITY: none]\n[SUGGEST: I have a headache | Tips for sleep | What can you do?]";
 else if(/^(hi|hello)/.test(lastL)) out="Hi "+(/Name: (\w+)/.exec(sys)||[])[1]+"! Lovely to hear from you. How are you feeling today?\n[SEVERITY: none]\n[SUGGEST: I feel unwell | Health tips]";
 else if(/allerg/.test(lastL)) out="Your saved allergies: "+((/Allergies: ([^\n]+)/.exec(sys)||[])[1]||'none saved')+".\n[SEVERITY: none]\n[SUGGEST: Update my profile]";
 else if(/chest pain/.test(lastL)) out="<think>hmm</think>Take it easy and rest for a while.\n[SEVERITY: self_care]\n[SUGGEST: Rest tips]";
 else if(/headache/.test(lastL)) out="Sorry you have a headache. Possible causes include **dehydration** or malaria.\n\n* Drink water\n* Rest\n[SEVERITY: self_care]\n[SUGGEST: How long will it last? | When to see a doctor? | What can I take?]";
 else out="OK.\n[SEVERITY: none]";
 console.log('REQ model='+j.model+' sysLen='+sys.length+' turns='+j.messages.length);
 setTimeout(()=>{r.setHeader('content-type','application/json');
 r.end(JSON.stringify({choices:[{message:{role:'assistant',content:out}}]}));},sys.startsWith('You write short titles')?50:1200);
});}).listen(9098);
