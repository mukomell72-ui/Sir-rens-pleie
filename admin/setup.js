(() => {
  const C=window.SIR_CONFIG;
  if(!C?.supabaseUrl||!C?.supabasePublishableKey)return;
  const client=window.SIR_ADMIN_SB||window.supabase?.createClient?.(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true}})||null;
  const loginForm=document.getElementById('loginForm');
  if(!loginForm)return;

  const loginStatus=document.createElement('div');
  loginStatus.id='loginStatus';loginStatus.className='notice hidden';loginForm.appendChild(loginStatus);

  const recoveryButton=document.createElement('button');
  recoveryButton.id='recoveryButton';recoveryButton.className='btn';recoveryButton.type='button';recoveryButton.textContent='Забыли пароль?';loginForm.appendChild(recoveryButton);

  const recoveryBox=document.createElement('form');
  recoveryBox.id='recoveryBox';recoveryBox.className='card hidden';
  recoveryBox.innerHTML='<h2>Новый пароль</h2><p class="mini">Введите новый пароль после перехода по защищённой ссылке из письма.</p><div class="field"><label>Новый пароль</label><input id="recoveryPassword" type="password" autocomplete="new-password" minlength="12" required></div><div class="field"><label>Повторите пароль</label><input id="recoveryPasswordAgain" type="password" autocomplete="new-password" minlength="12" required></div><button class="btn primary" type="submit">Сохранить новый пароль</button><div id="recoveryStatus" class="mini"></div>';
  document.getElementById('login')?.appendChild(recoveryBox);

  const showLoginStatus=(text,safe=false)=>{
    loginStatus.textContent=text;loginStatus.classList.remove('hidden','safe');
    if(safe)loginStatus.classList.add('safe');
  };

  recoveryButton.addEventListener('click',async()=>{
    const email=document.getElementById('email')?.value.trim()||'';
    if(!email){document.getElementById('email')?.focus();showLoginStatus('Сначала введите эл. почту аккаунта SIR.');return;}
    if(!client){showLoginStatus('Сервис входа временно недоступен. Обновите страницу и повторите.');return;}
    recoveryButton.disabled=true;recoveryButton.textContent='Отправляем…';
    try{
      const redirectTo=`${location.origin}${location.pathname}`;
      const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});
      if(error)throw error;
      showLoginStatus('Если аккаунт с такой эл. почтой существует, Supabase отправит защищённую ссылку. Проверьте также папку «Спам».',true);
    }catch(error){
      window.SIR_ADMIN_RUNTIME?.record(error,'auth.password_reset');
      showLoginStatus('Не удалось отправить письмо. Проверьте подключение и повторите позже.');
    }finally{
      recoveryButton.disabled=false;recoveryButton.textContent='Забыли пароль?';
    }
  });

  client?.auth.onAuthStateChange((event)=>{
    if(event!=='PASSWORD_RECOVERY')return;
    loginForm.classList.add('hidden');
    recoveryBox.classList.remove('hidden');
  });

  recoveryBox.addEventListener('submit',async e=>{
    e.preventDefault();
    const status=document.getElementById('recoveryStatus');
    const password=document.getElementById('recoveryPassword').value;
    const again=document.getElementById('recoveryPasswordAgain').value;
    if(!client){status.textContent='Сервис входа временно недоступен. Обновите страницу.';return;}
    if(password!==again){status.textContent='Пароли не совпадают.';return;}
    if(password.length<12){status.textContent='Используйте не менее 12 символов.';return;}
    if(!/[A-Za-zА-Яа-яЁё]/.test(password)||!/\d/.test(password)){
      status.textContent='Добавьте в пароль буквы и цифры.';return;
    }
    status.textContent='Сохраняем…';
    try{
      const {error}=await client.auth.updateUser({password});
      if(error)throw error;
      await client.auth.signOut();
      status.textContent='Пароль изменён. Возвращаемся ко входу.';
      setTimeout(()=>location.href=location.pathname,700);
    }catch(error){
      window.SIR_ADMIN_RUNTIME?.record(error,'auth.password_update');
      status.textContent='Ссылка недействительна или истекла. Запросите новое письмо.';
    }
  });
})();