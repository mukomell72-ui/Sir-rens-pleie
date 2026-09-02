(() => {
  const C=window.SIR_CONFIG;
  if(!C?.supabaseUrl||!C?.supabasePublishableKey)return;
  const client=window.supabase?.createClient?.(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true}})||null;
  const loginForm=document.getElementById('loginForm');
  const signupForm=document.getElementById('signupForm');
  const loginStatus=document.createElement('div');loginStatus.id='loginStatus';loginStatus.className='notice hidden';loginForm?.appendChild(loginStatus);
  const recoveryButton=document.createElement('button');recoveryButton.id='recoveryButton';recoveryButton.className='btn';recoveryButton.type='button';recoveryButton.textContent='Забыли пароль?';loginForm?.appendChild(recoveryButton);
  const recoveryBox=document.createElement('form');recoveryBox.id='recoveryBox';recoveryBox.className='card hidden';recoveryBox.innerHTML='<h2>Новый пароль</h2><p class="mini">Введите новый пароль после перехода по защищённой ссылке из письма.</p><div class="field"><label>Новый пароль</label><input id="recoveryPassword" type="password" autocomplete="new-password" minlength="12" required></div><div class="field"><label>Повторите пароль</label><input id="recoveryPasswordAgain" type="password" autocomplete="new-password" minlength="12" required></div><button class="btn primary" type="submit">Сохранить новый пароль</button><div id="recoveryStatus" class="mini"></div>';
  document.getElementById('login')?.appendChild(recoveryBox);

  const showLoginStatus=(text,safe=false)=>{loginStatus.textContent=text;loginStatus.classList.remove('hidden','safe');if(safe)loginStatus.classList.add('safe');};

  recoveryButton?.addEventListener('click',async()=>{
    const email=document.getElementById('email').value.trim();
    if(!email){document.getElementById('email').focus();showLoginStatus('Сначала введите email аккаунта OWNER.');return;}
    if(!client){showLoginStatus('Сервис входа временно недоступен. Обновите страницу и повторите.');return;}
    recoveryButton.disabled=true;recoveryButton.textContent='Отправляем…';
    const redirectTo=`${location.origin}${location.pathname}`;
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});
    recoveryButton.disabled=false;recoveryButton.textContent='Забыли пароль?';
    if(error){showLoginStatus('Не удалось отправить письмо. Проверьте подключение и повторите позже.');return;}
    showLoginStatus('Если аккаунт с таким email существует, Supabase отправит защищённую ссылку. Проверьте также папку «Спам».',true);
  });

  client?.auth.onAuthStateChange((event)=>{
    if(event!=='PASSWORD_RECOVERY')return;
    loginForm?.classList.add('hidden');signupForm?.closest('details')?.classList.add('hidden');recoveryBox.classList.remove('hidden');
  });

  recoveryBox.addEventListener('submit',async e=>{
    e.preventDefault();const status=document.getElementById('recoveryStatus'),password=document.getElementById('recoveryPassword').value,again=document.getElementById('recoveryPasswordAgain').value;
    if(!client){status.textContent='Сервис входа временно недоступен. Обновите страницу.';return;}
    if(password!==again){status.textContent='Пароли не совпадают.';return;}
    if(password.length<12){status.textContent='Используйте не менее 12 символов.';return;}
    status.textContent='Сохраняем…';const {error}=await client.auth.updateUser({password});
    if(error){status.textContent='Ссылка недействительна или истекла. Запросите новое письмо.';return;}
    await client.auth.signOut();status.textContent='Пароль изменён. Сейчас вернёмся ко входу.';setTimeout(()=>location.href=location.pathname,900);
  });

  loginForm?.addEventListener('submit',async e=>{
    const code=String(document.getElementById('ownerCode')?.value||'').trim();
    if(!code)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(!client){showLoginStatus('Сервис входа временно недоступен. Обновите страницу.');return;}
    const email=document.getElementById('email').value,password=document.getElementById('password').value;
    const {error}=await client.auth.signInWithPassword({email,password});
    if(error){showLoginStatus('Email или пароль неверны. Проверьте раскладку либо восстановите пароль.');return;}
    const {error:claimError}=await client.rpc('claim_initial_owner',{p_code:code});
    if(claimError){await client.auth.signOut();alert(claimError.message);return;}
    location.reload();
  },true);

  signupForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    const status=document.getElementById('signupStatus');
    if(!client){status.textContent='Сервис входа временно недоступен. Обновите страницу.';return;}
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
