(()=>{
  const POLICY_KEY='sir_language_policy_no_20260924_v2';
  if(localStorage.getItem(POLICY_KEY)!=='1'){
    for(const key of ['sir_admin_lang','sir_lang']){
      const saved=localStorage.getItem(key);
      if(saved&&saved!=='no')localStorage.setItem(key,'no');
    }
    localStorage.setItem(POLICY_KEY,'1');
  }
  const KEY='sir_admin_lang';
  const valid=new Set(['no','ru']);
  let lang=localStorage.getItem(KEY)||'no';
  if(!valid.has(lang))lang='no';

  const rows=[
    ['SIR Admin','Админка SIR'],['ADMIN','АДМИНКА'],['ARBEIDSSENTER','РАБОЧИЙ ЦЕНТР'],['KALENDER','КАЛЕНДАРЬ'],['SIKKERHETSKOPI','РЕЗЕРВНАЯ КОПИЯ'],['VEILEDNING · REDIGERING','СПРАВОЧНИК · РЕДАКТОР'],
    ['Logg inn i administrasjonspanelet','Вход в админ-панель'],['SIR-databasen er ikke koblet til denne versjonen ennå.','База SIR ещё не подключена к этой сборке.'],
    ['E-post','Эл. почта'],['Passord','Пароль'],['Logg inn','Войти'],['Glemt passord?','Забыли пароль?'],['Logg inn i','Сначала войдите в'],['Logg inn i SIR Admin først.','Сначала войдите в SIR Admin.'],['åpne deretter teknologikortet fra bestillingen.','затем откройте технологическую карту из заказа.'],[', åpne deretter teknologikortet fra bestillingen.',', затем откройте технологическую карту из заказа.'],['Åpne sikker forhåndsvisning','Открыть безопасный предпросмотр'],
    ['Innlogging skjer via sikker Supabase-autentisering. Ansattes passord vises ikke til eieren; tilgang styres av roller.','Вход выполняется через защищённую авторизацию Supabase. Пароли сотрудников владельцу не показываются; доступ ограничивается ролями.'],
    ['← Til SIR Rens & Pleie-nettstedet','← На сайт SIR Rens & Pleie'],['← Admin','← Админка'],['Åpne nettstedet','Открыть сайт'],['Logg ut','Выйти'],
    ['Arbeid','Работа'],['Kontrollsenter','Центр контроля'],['Bestillinger','Заказы'],['Kalender','Календарь'],['Lager','Склад'],
    ['Kunnskap','Знания'],['Utstyr og veiledning','Арсенал и справочник'],['Kjemi og prosedyrer','Химия и процедуры'],['Fortynningskalkulator','Калькулятор разбавления'],
    ['Administrasjon','Управление'],['Kunder','Клиенты'],['Økonomi / ENK','Финансы / ENK'],['Betalinger og anbefalinger','Оплаты и рекомендации'],['Team','Команда'],
    ['Handlingslogg','Журнал действий'],['Innstillinger','Настройки'],['Sikkerhetskopi','Резервная копия'],['SIR QR-kode','QR SIR'],
    ['Eier','Владелец'],['Administrator','Администратор'],['Leder','Менеджер'],['Utfører','Исполнитель'],['Forhåndsvisning','Предпросмотр'],
    ['Ny','Новый'],['Til vurdering','На рассмотрении'],['Tilbud sendt','Предложение отправлено'],['Venter på bekreftelse','Ждёт подтверждения'],['Bekreftet','Подтверждён'],
    ['Planlagt','Запланирован'],['Pågår','В работе'],['Fullført','Выполнен'],['Trenger nytt tidspunkt','Нужно другое время'],['Avbestilt av kunde','Отменён клиентом'],
    ['Avbestilt av SIR','Отменён SIR'],['Ikke møtt','Неявка'],['Venter','Ожидает'],['Opptjent','Начислен'],['Kreditert','Зачислен'],['Avvist','Отклонён'],
    ['Lav risiko','Низкий риск'],['Forsiktig','Осторожно'],['Høy risiko','Высокий риск'],['Ikke kontrollert','Не проверено'],['Kilde kontrollert','Источник проверен'],
    ['Kontrollert','Проверено'],['Kontrollert mot produsentens instruksjon','Проверено по инструкции производителя'],['Utkast','Черновик'],
    ['Lett','Лёгкое'],['Middels','Среднее'],['Kraftig','Сильное'],['Spesielt','Особое'],
    ['Bilinteriør','Салон автомобиля'],['Sofa','Диван'],['Lenestol','Кресло'],['Madrass','Матрас'],['Teppe','Ковёр'],
    ['Teppe / gulv','Ковролин'],['Barnesete','Детское кресло'],['Taktrekk','Потолок салона'],['Innvendig plast','Пластик салона'],['Skinn','Кожа'],['Sikkerhetsbelte','Ремень безопасности'],['Tekstil','Текстиль'],
    ['Kjemi','Химия'],['Prosedyrer','Процедуры'],['Kjemikalie','Средство'],['Bruksområde','Назначение'],['Fortynning','Разведение'],['Kontroll','Проверка'],['Risiko','Риск'],['Aktiv','Активно'],
    ['Rediger','Редактировать'],['Åpne','Открыть'],['Legg til middel','Добавить средство'],['Legg til prosedyre','Добавить процедуру'],['Lagre','Сохранить'],['Lagret','Сохранено'],['Avbryt','Отмена'],['Lukk','Закрыть'],['Slett','Удалить'],
    ['Veiledningsredigerer','Редактор справочника'],['Kjemi og teknologiske prosedyrer endres her uten å redigere nettstedets kode.','Химия и технологические процедуры меняются здесь без редактирования кода сайта.'],
    ['Fortynningskalkulator','Калькулятор разбавления'],['Beregner nøyaktig mengde kjemi og vann for ønsket volum.','Считает точное количество химии и воды для нужного объёма.'],
    ['Middel','Средство'],['Uten kobling — manuell beregning','Без привязки — ручной расчёт'],['Forhold','Пропорция'],['1 del middel + X deler vann','1 часть средства + X частей воды'],
    ['Ønsket sluttvolum, ml','Нужный итоговый объём, мл'],['Hvor mye vann er allerede fylt, ml','Сколько воды уже налито, мл'],['Beregningsmåte','Как считать'],
    ['Sluttvolum av løsning','Итоговый объём раствора'],['Vann er allerede fylt','Вода уже налита'],['Resultat','Результат'],['Middel:','Средство:'],['Vann:','Вода:'],['Totalt:','Итого:'],
    ['Konsentrasjon av middel i ferdig løsning','Концентрация средства в готовом растворе'],['Klar til bruk.','Готово к применению.'],['Fortynning fra produktkortet:','Разведение из карточки:'],
    ['Manuell beregning er bare matematikk. Kontroller tillatt fortynning mot produktkortet og produsentens instruksjon før bruk.','Ручной расчёт — только математика. Перед применением сверяйте допустимое разведение с карточкой средства и инструкцией производителя.'],
    ['STOP: valgt middel har ikke bestått HMS/SDS-kontroll eller er sperret. Arbeidsberegning er deaktivert.','STOP: выбранное средство не прошло HMS/SDS-проверку или заблокировано. Рабочий расчёт для него отключён.'],
    ['Beregn','Рассчитать'],['Vis hele lageret','Показать весь склад'],['HMS / STOP — sperrede midler','HMS / STOP — заблокированные средства'],['Krever sikkerhetskontroll','Требует проверки безопасности'],
    ['Lager og kjemi','Склад и химия'],['Beholdning og HMS-kontroll i én liste','Наличие средств и контроль HMS в одном списке'],['Beholdningskontroll','Контроль наличия'],
    ['På lager','Есть'],['Lite igjen','Заканчивается'],['Tomt','Нет'],['Notat','Заметка'],['For eksempel: bestill 1 l','Например: заказать 1 л'],
    ['Kalender','Календарь'],['Laster kalender…','Загрузка календаря…'],['I dag','Сегодня'],['Ledig','Свободно'],['venter på bekreftelse','ожидает подтверждения'],['bekreftet','подтверждено'],['pågår','в работе'],['fullført','выполнено'],['avbestilling/problem','отмена/проблема'],
    ['Planlegg arbeid','Запланировать работу'],['Bestilling','Заказ'],['Start','Начало'],['Varighet, min','Длительность, мин'],['Format','Формат'],['SIR kommer til kunden','SIR приезжает к клиенту'],['Kunden kommer til SIR','Клиент приезжает к SIR'],['Annet sted','Другое место'],['Adresse / sted','Адрес / место'],
    ['Lagre midlertidig tidspunkt','Сохранить временный слот'],['Midlertidig tidspunkt — kunden har ikke bekreftet ennå.','Временный слот — клиент ещё не подтвердил.'],['Tidspunkt bekreftet.','Слот подтверждён.'],
    ['Ring','Позвонить'],['Åpne bestilling','Открыть заказ'],
    ['BETALINGER · ANBEFALINGER','ОПЛАТЫ · РЕКОМЕНДАЦИИ'],['Betalinger','Оплаты'],['Anbefalinger','Рекомендации'],['Betalt','Оплачено'],['Ubetalt','Не оплачено'],
    ['Regnskap','Бухгалтерия'],['ENK · REGNSKAP','ENK · БУХГАЛТЕРИЯ'],['Oversikt','Обзор'],['Inntekter','Доходы'],['Utgifter','Расходы'],['Fakturaer','Счета'],['Kjøring','Поездки'],['Utstyr','Оборудование'],
    ['Faktura','Счёт'],['Kreditnota','Кредит-нота'],['Kunde','Клиент'],['Dato','Дата'],['Forfall','Срок оплаты'],['Levering','Выполнение'],['Beskrivelse','Описание'],['Beløp','Сумма'],['Å betale','К оплате'],['Betaling','Оплата'],
    ['Betalingsfrist','Срок оплаты'],['Kontonummer','Банковский счёт'],['Betalingsmåte','Способ оплаты'],['Status','Статус'],['MVA registrert','MVA зарегистрирован'],
    ['Under MVA-grensen','До порога MVA'],['Nær MVA-grensen','Близко к порогу MVA'],['Grensen er overskredet — kontroller MVA-registrering','Порог превышен — проверьте регистрацию MVA'],
    ['Sikkerhetskopi av SIR','Резервная копия SIR'],['Lag eksport','Создать экспорт'],['Last ned JSON-sikkerhetskopi','Скачать резервную копию JSON'],['Eksporten er klar. Oppbevar kopien på et sikkert sted.','Экспорт готов. Храните копию в безопасном месте.'],
    ['TEKNOLOG','ТЕХНОЛОГ'],['Teknologikort','Технологическая карта'],['Veiledningsredigerer','Редактор справочника'],['Start arbeid','Начать работу'],['Fullfør arbeid','Завершить работу'],['Arbeidet er startet.','Работа начата.'],['Arbeidet er markert som fullført.','Работа отмечена выполненной.'],
    ['Ingen nettverk','Нет сети'],['Oppdater','Обновить'],['Laster…','Загрузка…'],['Lagrer…','Сохраняем…'],['Sender…','Отправляем…'],['Prøver igjen','Повторить'],
    ['Kritisk modul ble ikke lastet. Ingen data ble endret. Oppdater siden.','Критический модуль не загрузился. Данные не изменялись. Обновите страницу.'],
    ['Visningen kan være ufullstendig. Ikke send endringer før tilkoblingen er gjenopprettet.','Просмотр может быть неполным. Изменения не отправляйте до восстановления подключения.'],
    ['Hvis delen oppfører seg uvanlig, oppdater siden før du endrer data.','Если раздел работает необычно, обновите страницу перед изменением данных.'],
    ['Søk','Поиск'],['Søk etter navn, merke, bruksområde eller materiale…','Поиск по названию, бренду, назначению или материалу…'],['Alle','Все'],['Ingen resultater','Ничего не найдено'],['Skriv inn e-postadressen til SIR-kontoen først.','Сначала введите эл. почту аккаунта SIR.'],
    ['Arbeidspanel','Рабочая панель'],['Forbruksvarer','Расходники'],['Glass','Стекло'],['Utvendig plast','Наружный пластик'],['Seter / tekstil','Сиденья / ткань'],['Teppe / matter','Ковролин / коврики'],['Taktrekk','Потолок'],['2. Smussgrad','2. Степень загрязнения'],['3. Type smuss','3. Тип загрязнения'],['Vanlig veismuss','Обычная дорожная грязь'],['Metallpartikler / rustbelegg','Металлические вкрапления / ржавый налёт'],['Bitumen / harpiks / lim','Битум / смола / клей'],['Insekter / proteinrester','Насекомые / белковые следы'],['Vis trinnvis plan','Показать пошаговый план'],['HMS / Stoffkartotek — profesjonell modus','HMS / Stoffkartotek — профессиональный режим'],['Veiledningen bruker et eget sikkerhetslag for profesjonelt arbeid i Norge. SDS og produsentetikett har alltid prioritet. Ny eller endret kjemi uten kontrollert HMS-oppføring får automatisk STOP. Intern SIR-policy: hver HMS/SDS-oppføring kontrolleres minst hver 365. dag og tidligere ved endring av formel, etikett eller dokumentasjon.','Справочник использует отдельный слой безопасности для профессиональной работы в Норвегии. SDS и этикетка производителя всегда имеют приоритет. Новая или изменённая химия без проверенной HMS-записи автоматически получает STOP. Внутренняя политика SIR: каждая HMS/SDS-запись перепроверяется минимум раз в 365 дней и раньше при смене формулы, этикетки или документации.'],['SDS kontrollert','SDS проверен'],['Før skiftet / arbeidet starter','Перед началом смены / работы'],['Kontroller tilgang til oppdatert SDS/stoffkartotek for all kjemi som skal brukes.','Проверить доступ к актуальному SDS/stoffkartotek для всей используемой химии.'],['Kontroller merking av arbeidsflasker: produktnavn, arbeidsfortynning og fare — aldri mat- eller drikkeflasker.','Проверить маркировку рабочих бутылок: название средства, рабочее разведение и опасность — никаких пищевых бутылок.'],['Klargjør kjemikalieresistente hansker og øyevern; annet verneutstyr etter SDS avsnitt 8.','Подготовить химстойкие перчатки и защиту глаз; дополнительные СИЗ — по SDS разделу 8.'],['Kontroller ventilasjon, rent skyllevann og utstyr for å håndtere lokalt søl.','Проверить вентиляцию, чистую воду для промывки и комплект для локализации пролива.'],['Hvis materiale, kjemi eller SDS ikke samsvarer med kortet — stans arbeidet og kontroller på nytt.','Если материал, химия или SDS не совпадают с карточкой — остановить работу и перепроверить.'],['Nødprosedyre','Аварийная памятка'],['Øyne: Ved kjemikaliesprut, start umiddelbart skylling med rennende vann mens øyelokkene holdes åpne. Ikke utsett skylling for å ringe.','Глаза: при попадании химии начать промывание немедленно проточной водой, удерживая веки открытыми. Не откладывать промывание ради звонка.'],['Giftinformasjonen: 22 59 13 00 — døgnåpent. Alvorlige symptomer: 113.','Giftinformasjonen: 22 59 13 00 — круглосуточно. Тяжёлые симптомы: 113.'],['Videre tiltak for hvert enkelt produkt skal hentes fra SDS avsnitt 4.','Для каждого конкретного продукта дальнейшие действия брать из SDS раздела 4.'],['Inventar gjennomgått fra 30 bilder: 25 unike produkter · 19 i bruk + 1 serviceprodukt · 5 i reserve','Инвентаризация по 30 фото: 25 уникальных средств · 19 рабочих + 1 служебное · 5 в резерве'],['Løsemiddel for lim, bitumen/tjære, harpiks, gummimerker, olje, fett, maling og tusj på løsemiddelbestandige overflater.','Растворитель для клея, битума, смолы, следов резины, масла, жира, краски и маркера на стойких к растворителям поверхностях.'],['Flekk- og voksfjerner for fete og organiske forurensninger: kosmetikk, olje, blekk, maling, parafin/voks, harpiks osv.','Пятно- и воскoудалитель для жирных и органических загрязнений: косметика, масло, чернила, краска, парафин/воск, смола и т.п.'],['Luktnøytraliserer for interiør og tekstil: tobakk, dyr, fukt, råte og husholdningslukt.','Нейтрализатор запахов для салона и текстиля: табак, животные, сырость, гниение и бытовые запахи.'],['Bruksklar glass- og speilrens for fett, støv, insektrester og vanlig trafikkfilm uten skjolder.','Готовый очиститель стёкол и зеркал для жира, пыли, следов насекомых и обычной дорожной плёнки без разводов.'],['Alkalisk universalrens for hardnakket smuss på plast, tekstiler, tepper, døråpninger, motorrom og andre robuste overflater.','Щелочной универсальный очиститель для стойкой грязи на пластике, тканях, ковролине, дверных проёмах, моторном отсеке и других стойких поверхностях.'],['Pleie og konservering av glatt, semsket/velour og perforert skinn med naturlig silkematt finish.','Уход и консервация гладкой, велюровой и перфорированной кожи с естественным шелковисто-матовым финишем.'],['pH-nøytral sjampo for håndvask, særlig for beskyttet lakk og regelmessig vedlikehold.','pH-нейтральный шампунь для ручной мойки, особенно для защищённого кузова и регулярного ухода.'],['Pleie og beskyttelse av ulakkert utvendig plast, gummi og dørtetninger. I SIR-prosedyren brukes CARPRO DarkSide separat på dekksider.','Уход и защита наружного неокрашенного пластика, резины и дверных уплотнителей. В технологии SIR для боковин шин используется отдельный CARPRO DarkSide.'],['Nøytral rengjøring for tekstil, seter, tepper, Alcantara, skinn og taktrekk.','Нейтральный очиститель для ткани, сидений, ковролина, алькантары, кожи и потолка.'],['Fjerner metallpartikler og rustbelegg fra karosseri og felger.','Удалитель металлических вкраплений и ржавого налёта с кузова и дисков.'],['Avsluttende pleie for innvendig plast og gummi: satinmatt finish, antistatisk effekt og UV-beskyttelse.','Финишный уход за внутренним пластиком и резиной: сатиново-матовый финиш, антистатик и UV-защита.'],['Bruksklar beskyttelse for dekksider og gummi med satin-svart finish og god holdbarhet.','Готовый защитный состав для боковин шин и резины с сатиновым чёрным финишем и хорошей стойкостью.'],['Ikke-slipende finishprodukt for oppfriskning og maskering av lette defekter, særlig på allerede beskyttet eller keramisk behandlet lakk.','Финишный неабразивный состав для освежения и маскировки лёгких дефектов, особенно на уже защищённом или керамически покрытом ЛКП.'],['Dekkrens for å fjerne gamle dekkdressinger, trafikkfilm og brunt belegg før beskyttelse.','Очиститель шин и резины для удаления старых чернителей, дорожной плёнки и коричневого налёта перед нанесением защиты.'],['Skumdemper for utstyr. Er ikke et rengjøringsmiddel og skal ikke påføres karosseri, interiør, tekstil eller tepper.','Пеногаситель для оборудования. Не является чистящим средством и не наносится на кузов, салон, ткань или ковролин.'],['Lavtskummende ekstraksjonsrens for tepper, tekstil og møbeltrekk.','Низкопенный экстракторный очиститель для ковров, текстиля и обивки.'],['pH-nøytralt snøskum for berøringsfri forvask og løsning av trafikkfilm.','pH-нейтральная snow foam для бесконтактной предварительной мойки и размягчения дорожной грязи.'],['Kontaktsjampo for vask av karosseri via skumkanon etter forvask.','Контактный шампунь для мойки кузова через пенокомплект после предмойки.'],['Håndprodukt for å redusere lette og middels riper, vaskeriper og lakksmitte.','Ручной состав для уменьшения лёгких и средних царапин, паутинки и следов переноса краски.'],['Eldre versjon av Gtechniq W4 Citrus Foam med rød etikett: pH-nøytral sitrusbasert berøringsfri forvask for trafikkfilm og insektrester; trygg for beskyttelser når instruksjonen følges.','Старая версия Gtechniq W4 Citrus Foam с красной этикеткой: pH-нейтральная цитрусовая бесконтактная предмойка для дорожной грязи и следов насекомых; безопасна для покрытий при соблюдении инструкции.'],['Duftprodukt for kupeen.','Ароматизатор салона.'],['Runde blå applikatorer, 10 stk.','Круглые синие аппликаторы, 10 шт.'],['Påføring av Leather Star, Top Star, DarkSide og beskyttelsesprodukter.','Нанесение Leather Star, Top Star, DarkSide и защитных составов.'],['Lyseblå lofrie mikrofiberkluter, 20 stk.','Светло-голубые безворсовые микрофибры, 20 шт.'],['Glass, plast og fjerning av kjemikalierester.','Стёкла, пластик, удаление остатков химии.'],['Børster av hestehår, 2 stk.','Щётки из конского волоса, 2 шт.'],['Skånsom rengjøring av skinn, myk plast og sømmer.','Деликатная очистка кожи, мягкого пластика и швов.'],['Lang SEAMETAL-børste','Длинная щётка SEAMETAL'],['Luftdyser, trange steder, vanskelig tilgjengelige områder og felger.','Воздуховоды, узкие места, труднодоступные зоны и диски.'],['Sett med detailingbørster, 6 stk.','Набор детейлинг-кистей, 6 шт.'],['Knapper, sømmer, luftdyser, emblemer og vanskelig tilgjengelige områder.','Кнопки, швы, воздуховоды, эмблемы и труднодоступные зоны.'],['Klut / applikator','Салфетка / аппликатор'],['Klut','Салфетка'],['Sprøyteflaske','Распылитель'],['Svamp / mikrofiber','Губка / микрофибра'],['Bøtte + vaskehanske','Ведро + рукавица'],['Svamp / applikator','Губка / аппликатор'],['Sprøyteflaske / mikrofiber','Распылитель / микрофибра'],['Sprøyteflaske → svamp','Распылитель → губка'],['Applikator','Аппликатор'],['Applikator / poleringsmaskin','Аппликатор / машинка'],['Sprøyteflaske + børste','Распылитель + щётка'],['Skal ikke påføres overflaten','Не наносить на поверхность'],['Sprøyteflaske ELLER ekstraktor','Распылитель ИЛИ экстрактор'],['Skumkanon','Пенообразователь'],['Skumkanon + vaskehanske','Пенообразователь + рукавица'],['Mikrofiber / poleringsmaskin','Микрофибра / полировальная машинка'],['Skumkanon eller pumpesprøyte','Пенообразователь или помповый распылитель'],['Kjøp ↗','Купить ↗'],['ikke lagt til','не добавлено'],['Interiør','Салон'],['Karosseri','Кузов'],['Hjul','Колёса'],['Plast','Пластик'],['Duft','Ароматы'],['Arbeidspanel for detailing','Рабочая панель детейлинга'],['Rask tilgang til arbeidsprosedyrer, kjemi og HMS/SDS. Grensesnittet er laget for enhåndsbruk på telefon og fullverdig bruk på datamaskin.','Быстрый доступ к технологическим схемам, химии и HMS/SDS. Интерфейс построен для работы с телефона одной рукой и для полноценной панели на компьютере.'],['Velg arbeidsprosedyre','Подобрать схему'],['Område → smuss → sikker trinnvis plan','Элемент → загрязнение → безопасный пошаговый план'],['Finn produkt','Найти средство'],['Etter navn, overflate, oppgave eller materiale','По названию, поверхности, задаче или материалу'],['Risiko, verneutstyr, førstehjelp og kontrollerte dokumenter','Риски, СИЗ, первая помощь и проверенные документы'],['Kontroll av veiledningen: OK','Контроль справочника: OK'],['Rengjøringsveileder etter område','Мастер очистки по элементу'],['Velg område, grad og type smuss. Veiledningen bygger en sikker trinnvis plan med SIR-kjemi: blandingsforhold, verktøy, arbeidsrekkefølge, skylling, tørking og risiko.','Выберите элемент, степень и тип загрязнения. Справочник соберёт безопасный пошаговый план из химии SIR: разведение, инструмент, порядок работы, смыв, сушка и риски.'],['1. Område','1. Элемент'],['Karosseri / lakk','Кузов / ЛКП'],['Hele hjulet','Колесо целиком'],['Felger','Диски'],['Dekk','Шины'],['PROFESJONELL MODUS','ПРОФЕССИОНАЛЬНЫЙ РЕЖИМ'],['Sikkerhet','Безопасность'],['Bruk','Применение'],['Advarsler','Предупреждения'],['Oppbevaring','Хранение'],['Førstehjelp','Первая помощь'],
    ['Personlig verneutstyr','Средства индивидуальной защиты'],['HMS / kjemikalieregister','HMS / реестр химических веществ'],['Bygg arbeidsplan','Составить план работы'],['Arbeidsplan','План работы'],
    ['Overflate','Поверхность'],['Forurensning','Загрязнение'],['Materiale','Материал'],['Metode','Метод'],['Kjemiregel','Правило химии'],['Mekanisk metode','Механический метод'],['Stoppbetingelser','Условия STOP'],
    ['mandag','понедельник'],['tirsdag','вторник'],['onsdag','среда'],['torsdag','четверг'],['fredag','пятница'],['lørdag','суббота'],['søndag','воскресенье'],
    ['januar','январь'],['februar','февраль'],['mars','март'],['april','апрель'],['mai','май'],['juni','июнь'],['juli','июль'],['august','август'],['september','сентябрь'],['oktober','октябрь'],['november','ноябрь'],['desember','декабрь']
  ];

  const tokenRows=[
    ['Språk','Язык'],['Norsk','Норвежский'],['Russisk','Русский'],['Tilbake','Назад'],['Neste','Далее'],['Ferdig','Готово'],['Ja','Да'],['Nei','Нет'],
    ['Aktiv','Активен'],['Inaktiv','Неактивен'],['Navn','Имя'],['Telefon','Телефон'],['Adresse','Адрес'],['Pris','Цена'],['Tid','Время'],['Minutter','Минуты'],
    ['Kommentar','Комментарий'],['Bilder','Фото'],['Kilde','Источник'],['Produsent','Производитель'],['Instruksjon','Инструкция'],['Arbeid','Работа'],['Handling','Действие'],
    ['Profil','Профиль'],['Opprettet','Создано'],['Oppdatert','Обновлено'],['Feil','Ошибка'],['Advarsel','Предупреждение'],['Bekreft','Подтвердить'],
    ['OWNER','Владелец'],['ADMIN','Администратор'],['MANAGER','Менеджер'],['WORKER','Исполнитель'],
    ['HIGH_RISK','Высокий риск'],['HIGH RISK','Высокий риск'],['CAUTION','Осторожно'],['LOW','Низкий риск'],
    ['source_reviewed','Источник проверен'],['manufacturer_verified','Проверено по инструкции производителя'],['unverified','Не проверено'],['verified','Проверено'],['draft','Черновик'],
    ['pending','Ожидает'],['issued','Выставлен'],['credited','Исправлен кредит-нотой'],['cancelled','Отменён'],['paid','Оплачен'],
    ['bank','Банковский перевод'],['card','Карта'],['cash','Наличные'],['other','Другое'],
    ['Admin','Админка'],['Regnskap','Бухгалтерия'],['Faktura','Счёт'],['Kreditnota','Кредит-нота'],['Email','Эл. почта'],['email','эл. почта'],['Stoffkartotek','реестр химических веществ'],['Arbeidstilsynet','Норвежская инспекция труда'],['Giftinformasjonen','токсикологическая служба'],['legacy','старая версия'],['paint-prep','средство подготовки ЛКП'],['soft-touch','мягкое покрытие']
  ];

  const ruToNo=[
    ['химических/служебных карточек','kjemi-/systemkort'],['В СПРАВОЧНИКЕ:','I VEILEDNINGEN:'],['РАСХОДНИКИ','FORBRUKSVARER'],['оранжевый','oransje'],['розовый','rosa'],['серебристый','sølv'],['жёлто-зелёный','gulgrønn'],['бирюзовый','turkis'],['жёлтый','gul'],['салатовый','limegrønn'],['красный','rød'],['фиолетовый','lilla'],['жёлто-серый','gulgrå'],['бело-синий','hvit/blå'],['белый/жёлтый','hvit/gul'],['голубой','lyseblå'],['зелёный','grønn'],['HMS слой','HMS-lag'],['следующая обязательная перепроверка не позднее','neste obligatoriske kontroll senest'],['HMS готовы','HMS klare'],['позиций','elementer'],['Центр контроля','Kontrollsenter'],['Под контролем','Under kontroll'],['Требует внимания','Krever oppmerksomhet'],['Срочных действий нет','Ingen hastetiltak'],
    ['Решение','Beslutning'],['Не оплачено','Ikke betalt'],['Запланировано','Planlagt'],['В работе','Pågår'],['Последние заказы','Siste bestillinger'],
    ['Создать заказ','Opprett bestilling'],['Новый заказ','Ny bestilling'],['Клиент','Kunde'],['Телефон','Telefon'],['Адрес','Adresse'],['Услуга','Tjeneste'],['Статус','Status'],['Оплата','Betaling'],
    ['Итоговая цена','Sluttpris'],['Предварительная цена','Foreløpig pris'],['Сохранить','Lagre'],['Отмена','Avbryt'],['Закрыть','Lukk'],['Открыть','Åpne'],['Редактировать','Rediger'],
    ['Сегодня','I dag'],['Загрузка','Laster'],['Проверка доступа','Kontrollerer tilgang'],['Повторить','Prøv igjen'],['Нет доступа','Ingen tilgang'],
    ['Доступно после входа','Tilgjengelig etter innlogging'],['Рабочий день','Arbeidsdag'],['буфер','buffer'],['мин','min'],['Свободно','Ledig'],
    ['Имя','Navn'],['Роль','Rolle'],['Активен','Aktiv'],['Команда','Team'],['Раздельные аккаунты и роли','Separate kontoer og roller'],
    ['Журнал','Logg'],['Критические изменения','Kritiske endringer'],['Время','Tid'],['Событие','Hendelse'],['Объект','Objekt'],['Пользователь','Bruker'],
    ['Компания','Bedrift'],['Основной телефон','Primærtelefon'],['Второй телефон','Sekundærtelefon'],['Радиус, км','Radius, km'],['Выезд','Utrykning'],['Рабочее время','Arbeidstid'],
    ['Начало','Start'],['Конец','Slutt'],['Сохранить все настройки','Lagre alle innstillinger'],['Стартовые цены','Startpriser'],['Услуга','Tjeneste'],['Размер','Størrelse'],
    ['Лёгкое','Lett'],['Среднее','Middels'],['Сильное','Kraftig'],['Химия','Kjemi'],['Процедуры','Prosedyrer'],['Средство','Middel'],['Назначение','Bruksområde'],['Разведение','Fortynning'],
    ['Проверка','Kontroll'],['Риск','Risiko'],['Активно','Aktiv'],['Добавить средство','Legg til middel'],['Добавить процедуру','Legg til prosedyre'],
    ['Калькулятор разбавления','Fortynningskalkulator'],['Пропорция','Forhold'],['Вода','Vann'],['Итого','Totalt'],['Рассчитать','Beregn'],
    ['Склад и химия','Lager og kjemi'],['Контроль наличия','Beholdningskontroll'],['Есть','På lager'],['Заканчивается','Lite igjen'],['Нет','Tomt'],['Заметка','Notat'],
    ['Календарь','Kalender'],['Заказ','Bestilling'],['Длительность','Varighet'],['Формат','Format'],['Другое место','Annet sted'],['Позвонить','Ring'],
    ['Оплаты','Betalinger'],['Рекомендации','Anbefalinger'],['Финансы','Økonomi'],['Бухгалтерия','Regnskap'],['Доход','Inntekt'],['Расход','Utgift'],['Счёт','Faktura'],
    ['Кредит-нота','Kreditnota'],['Дата','Dato'],['Срок оплаты','Forfall'],['Описание','Beskrivelse'],['Сумма','Beløp'],['К оплате','Å betale'],['Способ оплаты','Betalingsmåte'],
    ['Резервная копия','Sikkerhetskopi'],['Создать экспорт','Lag eksport'],['Скачать резервную копию JSON','Last ned JSON-sikkerhetskopi'],
    ['Технолог','Teknolog'],['Технологическая карта','Teknologikort'],['Начать работу','Start arbeid'],['Завершить работу','Fullfør arbeid'],
    ['Низкий риск','Lav risiko'],['Осторожно','Forsiktig'],['Высокий риск','Høy risiko'],['Не проверено','Ikke kontrollert'],['Источник проверен','Kilde kontrollert'],['Проверено','Kontrollert'],
    ['Владелец','Eier'],['Администратор','Administrator'],['Менеджер','Leder'],['Исполнитель','Utfører'],['Предпросмотр','Forhåndsvisning'],
    ['понедельник','mandag'],['вторник','tirsdag'],['среда','onsdag'],['четверг','torsdag'],['пятница','fredag'],['суббота','lørdag'],['воскресенье','søndag'],
    ['январь','januar'],['февраль','februar'],['март','mars'],['апрель','april'],['май','mai'],['июнь','juni'],['июль','juli'],['август','august'],['сентябрь','september'],['октябрь','oktober'],['ноябрь','november'],['декабрь','desember']
  ];

  const exact=new Map();
  for(const [no,ru] of rows){exact.set(no,{no,ru});exact.set(ru,{no,ru});}
  for(const [no,ru] of tokenRows){exact.set(no,{no,ru});exact.set(ru,{no,ru});}

  const ruParts=[...ruToNo].sort((a,b)=>b[0].length-a[0].length);
  const noParts=[...tokenRows,...rows].sort((a,b)=>b[0].length-a[0].length);

  function preserveSpace(raw,value){
    const lead=raw.match(/^\s*/)?.[0]||'',tail=raw.match(/\s*$/)?.[0]||'';
    return lead+value+tail;
  }

  const rxEscape=v=>String(v).replace(/[.*+?^$(){}|[\]\\]/g,'\\$&');
  function replacePart(value,from,to){
    if(!from)return value;
    if(/^[\p{L}\p{N}_]+$/u.test(from)){
      const re=new RegExp('(^|[^\\p{L}\\p{N}_])'+rxEscape(from)+'(?=$|[^\\p{L}\\p{N}_])','gu');
      return value.replace(re,(m,prefix)=>prefix+to);
    }
    return value.split(from).join(to);
  }

  function translate(raw){
    if(raw==null)return raw;
    const source=String(raw),trimmed=source.trim();
    if(!trimmed)return source;
    const hit=exact.get(trimmed);
    if(hit)return preserveSpace(source,hit[lang]);
    let out=trimmed;
    if(lang==='no' && /[А-Яа-яЁё]/.test(out)){
      for(const [ru,no] of ruParts)out=replacePart(out,ru,no);
    }else if(lang==='ru' && /[A-Za-zÆØÅæøå]/.test(out)){
      for(const [no,ru] of noParts)out=replacePart(out,no,ru);
    }
    return out===trimmed?source:preserveSpace(source,out);
  }

  let applying=false;
  function apply(root=document.body){
    if(applying||!root)return;
    applying=true;
    try{
      const base=root.nodeType===1?root:root.parentElement||document.body;
      const walker=document.createTreeWalker(base,NodeFilter.SHOW_TEXT);const nodes=[];
      while(walker.nextNode())nodes.push(walker.currentNode);
      for(const n of nodes){
        const p=n.parentElement;if(!p||['SCRIPT','STYLE','CODE','PRE'].includes(p.tagName))continue;
        const v=translate(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v;
      }
      const els=[base,...(base.querySelectorAll?.('[placeholder],[title],[aria-label]')||[])];
      for(const el of els)for(const a of ['placeholder','title','aria-label']){
        if(!el?.hasAttribute?.(a))continue;const before=el.getAttribute(a),after=translate(before);if(after!==before)el.setAttribute(a,after);
      }
      document.documentElement.lang=lang==='no'?'nb':'ru';
      const dt=translate(document.title);if(dt!==document.title)document.title=dt;
      document.querySelectorAll('[data-sir-lang]').forEach(b=>b.classList.toggle('active',b.dataset.sirLang===lang));
      const sw=document.querySelector('.sir-lang-switch');
      if(sw)sw.setAttribute('aria-label',lang==='no'?'Språkvalg':'Выбор языка');
    }finally{applying=false;}
  }

  function makeSwitch(){
    if(document.querySelector('.sir-lang-switch'))return;
    const hosts=[];
    const login=document.querySelector('#login');if(login)hosts.push(login);
    const topActions=document.querySelector('.admin-top-actions');if(topActions)hosts.push(topActions);
    if(!topActions){const toolbar=document.querySelector('.admin-top .toolbar');if(toolbar)hosts.push(toolbar);}
    if(!hosts.length){const top=document.querySelector('.admin-top')||document.querySelector('.nav');if(top)hosts.push(top);}
    if(!hosts.length)hosts.push(document.body);
    for(const host of hosts){
      const wrap=document.createElement('div');wrap.className='sir-lang-switch';wrap.setAttribute('role','group');
      wrap.innerHTML='<button type="button" data-sir-lang="no">NO</button><button type="button" data-sir-lang="ru">RU</button>';
      host.appendChild(wrap);
      wrap.querySelectorAll('[data-sir-lang]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.sirLang)));
    }
  }

  function style(){
    if(document.getElementById('sirLangStyle'))return;
    const s=document.createElement('style');s.id='sirLangStyle';
    s.textContent='.sir-lang-switch{display:inline-flex;gap:3px;padding:3px;border:1px solid #39444f;border-radius:999px;background:#0b1116;align-items:center;flex:0 0 auto}.login>.sir-lang-switch{margin:0 0 12px auto}.sir-lang-switch button{border:0;background:transparent;color:#9eabb5;font:800 12px/1 system-ui;padding:7px 9px;border-radius:999px;cursor:pointer}.sir-lang-switch button.active{background:#38d3ae;color:#07120f}@media(max-width:700px){.admin-top .sir-lang-switch,.nav>.sir-lang-switch{margin-left:auto}.login>.sir-lang-switch{position:static;box-shadow:none}}@media print{.sir-lang-switch{display:none!important}}';
    document.head.appendChild(s);
  }

  function select(next){
    if(!valid.has(next))return;
    lang=next;localStorage.setItem(KEY,lang);
    location.reload();
  }

  function init(){
    style();makeSwitch();apply();
    const obs=new MutationObserver(ms=>{
      if(applying)return;
      for(const m of ms){
        if(m.type==='characterData'){apply(m.target.parentElement||document.body);continue;}
        for(const n of m.addedNodes){if(n.nodeType===1)apply(n);else if(n.nodeType===3)apply(n.parentElement||document.body);}
      }
    });
    obs.observe(document.body,{subtree:true,childList:true,characterData:true});
  }

  window.SIR_ADMIN_I18N={get lang(){return lang},select,apply,translate};
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',init,{once:true});else init();
})();