(() => {
  const C=window.SIR_CONFIG;
  if(!C?.supabaseUrl||!C?.supabasePublishableKey||!window.supabase)return;
  const client=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true}});
  const loginForm=document.getElementById('loginForm');
  const signupForm=document.getElementById('signupForm');

  loginForm?.addEventListener('submit',async e=>{
    const code=String(document.getElementById('ownerCode')?.value||'').trim();
    if(!code)return;
    e.preventDefault();e.stopImmediatePropagation();
    const email=document.getElementById('email').value,password=document.getElementById('password').value;
    const {error}=await client.auth.signInWithPassword({email,password});
    if(error){alert(error.message);return;}
    const {error:claimError}=await client.rpc('claim_initial_owner',{p_code:code});
    if(claimError){await client.auth.signOut();alert(claimError.message);return;}
    location.reload();
  },true);

  signupForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    const status=document.getElementById('signupStatus');
    status.textContent='Создаём защищённый аккаунт…';
    const display_name=document.getElementById('signupName').value.trim();
    const email=document.getElementById('signupEmail').value.trim();
    const password=document.getElementById('signupPassword').value;
    const code=document.getElementById('signupOwnerCode').value.trim();
    const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name}}});
    if(error){status.textContent=error.message;return;}
    if(data.session){
      const {error:claimError}=await client.rpc('claim_initial_owner',{p_code:code});
      if(claimError){status.textContent=claimError.message;return;}
      location.reload();return;
    }
    document.getElementById('email').value=email;
    document.getElementById('ownerCode').value=code;
    status.textContent='Аккаунт создан. Подтвердите письмо Supabase в своей почте, затем войдите выше с тем же паролем и кодом OWNER.';
  });
})();
