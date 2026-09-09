#include <a_samp>

#define COLOR_WHITE 0xFFFFFFFF
#define COLOR_GREEN 0x33CC66FF
#define COLOR_RED 0xE74C3CFF
#define COLOR_YELLOW 0xF1C40FFF
#define COLOR_BLUE 0x3498DBFF
#define COLOR_GREY 0xBFC5CAFF
#define COLOR_ORANGE 0xF39C12FF
#define COLOR_PURPLE 0x9B59B6FF

#define DIALOG_AUTH_REGISTER 1000
#define DIALOG_AUTH_LOGIN 1001
#define DIALOG_MENU 1010
#define DIALOG_STATS 1011
#define DIALOG_COMMANDS 1012
#define DIALOG_SETTINGS 1013
#define DIALOG_SECURITY 1014
#define DIALOG_REPORT 1015
#define DIALOG_IMPROVEMENTS 1016
#define DIALOG_RULES 1017
#define DIALOG_CHANGENAME 1018
#define DIALOG_EXTRA 1019
#define DIALOG_PROMO 1020
#define DIALOG_ACHIEVEMENTS 1021
#define DIALOG_QUESTS 1022
#define DIALOG_DM 1023
#define DIALOG_BANK 1024
#define DIALOG_BANK_DEPOSIT 1025
#define DIALOG_BANK_WITHDRAW 1026
#define DIALOG_DAILY 1027
#define DIALOG_JOB 1028
#define DIALOG_ADMIN_REPORTS 1030
#define DIALOG_ADMIN_HELP 1031

#define DM_WORLD 777
#define MAX_LOGIN_ATTEMPTS 3

new bool:gLogged[MAX_PLAYERS];
new gPasswordHash[MAX_PLAYERS];
new gBank[MAX_PLAYERS];
new gDonate[MAX_PLAYERS];
new gAdmin[MAX_PLAYERS];
new gKills[MAX_PLAYERS];
new gDeaths[MAX_PLAYERS];
new gDMKills[MAX_PLAYERS];
new gPromoUsed[MAX_PLAYERS];
new gLastDaily[MAX_PLAYERS];
new gCourierDone[MAX_PLAYERS];
new gQuestKills[MAX_PLAYERS];
new bool:gPMEnabled[MAX_PLAYERS];
new gLoginAttempts[MAX_PLAYERS];
new gSessionStart[MAX_PLAYERS];

new bool:gInDM[MAX_PLAYERS];
new Float:gOldX[MAX_PLAYERS];
new Float:gOldY[MAX_PLAYERS];
new Float:gOldZ[MAX_PLAYERS];
new Float:gOldA[MAX_PLAYERS];
new Float:gOldHealth[MAX_PLAYERS];
new Float:gOldArmour[MAX_PLAYERS];
new gOldInterior[MAX_PLAYERS];
new gOldWorld[MAX_PLAYERS];
new gOldWeapon[MAX_PLAYERS][13];
new gOldAmmo[MAX_PLAYERS][13];

new bool:gCourier[MAX_PLAYERS];
new gCourierStep[MAX_PLAYERS];

new bool:gReportOpen[MAX_PLAYERS];
new gReportText[MAX_PLAYERS][128];

new const Float:gDMSpawns[][4] =
{
    {-1641.6, 1546.1, 35.0, 90.0},
    {-1622.1, 1559.4, 35.0, 180.0},
    {-1658.4, 1567.7, 35.0, 270.0},
    {-1636.0, 1581.2, 35.0, 0.0},
    {-1607.3, 1549.9, 35.0, 135.0},
    {-1668.2, 1534.5, 35.0, 315.0},
    {-1592.5, 1570.1, 35.0, 225.0},
    {-1648.8, 1519.7, 35.0, 45.0}
};

new const Float:gCourierCP[][3] =
{
    {1481.8, -1771.2, 18.8},
    {1367.3, -1279.7, 13.5},
    {1179.1, -1323.5, 14.1},
    {1037.7, -1339.4, 13.7},
    {812.2, -1616.4, 13.5}
};

main()
{
    print("--------------------------------------------");
    print(" BLACK CRUSH REBORN - clean core gamemode");
    print("--------------------------------------------");
}

public OnGameModeInit()
{
    SetGameModeText("BLACK CRUSH REBORN");
    ShowPlayerMarkers(PLAYER_MARKERS_MODE_GLOBAL);
    ShowNameTags(1);
    SetNameTagDrawDistance(45.0);
    EnableStuntBonusForAll(0);
    UsePlayerPedAnims();
    DisableInteriorEnterExits();
    AddPlayerClass(299, 1481.0, -1771.0, 18.8, 90.0, 0, 0, 0, 0, 0, 0);
    AddStaticVehicleEx(560, 1473.0, -1737.0, 13.3, 90.0, 1, 1, 120);
    AddStaticVehicleEx(562, 1473.0, -1742.0, 13.3, 90.0, 6, 6, 120);
    AddStaticVehicleEx(411, 1473.0, -1747.0, 13.3, 90.0, 3, 3, 120);
    return 1;
}

public OnGameModeExit()
{
    for(new i = 0; i < MAX_PLAYERS; i++)
    {
        if(IsPlayerConnected(i) && gLogged[i]) SaveAccount(i);
    }
    return 1;
}

public OnPlayerConnect(playerid)
{
    ResetRuntime(playerid);
    SetPlayerColor(playerid, COLOR_WHITE);
    SendClientMessage(playerid, COLOR_BLUE, "Добро пожаловать на BLACK CRUSH REBORN.");
    ShowAuthDialog(playerid);
    return 1;
}

public OnPlayerDisconnect(playerid, reason)
{
    #pragma unused reason
    if(gLogged[playerid]) SaveAccount(playerid);
    gLogged[playerid] = false;
    gReportOpen[playerid] = false;
    return 1;
}

public OnPlayerRequestClass(playerid, classid)
{
    #pragma unused classid
    SetPlayerPos(playerid, 1481.0, -1771.0, 18.8);
    SetPlayerCameraPos(playerid, 1470.0, -1785.0, 24.0);
    SetPlayerCameraLookAt(playerid, 1481.0, -1771.0, 18.8);
    return 1;
}

public OnPlayerSpawn(playerid)
{
    if(!gLogged[playerid])
    {
        TogglePlayerControllable(playerid, 0);
        ShowAuthDialog(playerid);
        return 1;
    }
    TogglePlayerControllable(playerid, 1);
    if(gInDM[playerid])
    {
        SpawnDM(playerid);
        return 1;
    }
    SetPlayerInterior(playerid, 0);
    SetPlayerVirtualWorld(playerid, 0);
    SetPlayerPos(playerid, 1481.0, -1771.0, 18.8);
    SetPlayerFacingAngle(playerid, 90.0);
    SetCameraBehindPlayer(playerid);
    SetPlayerHealth(playerid, 100.0);
    return 1;
}

public OnPlayerDeath(playerid, killerid, reason)
{
    #pragma unused reason
    if(gLogged[playerid])
    {
        gDeaths[playerid]++;
        if(gInDM[playerid]) SaveAccount(playerid);
    }
    if(killerid != INVALID_PLAYER_ID && killerid != playerid && gLogged[killerid])
    {
        gKills[killerid]++;
        gQuestKills[killerid]++;
        if(gInDM[killerid] && gInDM[playerid])
        {
            gDMKills[killerid]++;
            GivePlayerMoney(killerid, 25000);
            SendClientMessage(killerid, COLOR_GREEN, "DM: +25.000$ за убийство.");
        }
        SaveAccount(killerid);
    }
    return 1;
}

public OnPlayerEnterCheckpoint(playerid)
{
    if(!gCourier[playerid]) return 1;
    DisablePlayerCheckpoint(playerid);
    GivePlayerMoney(playerid, 15000);
    SendClientMessage(playerid, COLOR_GREEN, "Курьер: точка доставлена, +15.000$.");
    gCourierStep[playerid]++;
    if(gCourierStep[playerid] >= sizeof(gCourierCP))
    {
        gCourier[playerid] = false;
        gCourierStep[playerid] = 0;
        gCourierDone[playerid]++;
        GivePlayerMoney(playerid, 75000);
        SendClientMessage(playerid, COLOR_YELLOW, "Маршрут завершён! Бонус +75.000$.");
        SaveAccount(playerid);
        return 1;
    }
    SetCourierCheckpoint(playerid);
    return 1;
}

public OnPlayerText(playerid, text[])
{
    if(!gLogged[playerid]) return 0;
    if(text[0] == '@')
    {
        if(gAdmin[playerid] < 1 && !IsPlayerAdmin(playerid)) return 0;
        new name[MAX_PLAYER_NAME], msg[160];
        GetPlayerName(playerid, name, sizeof(name));
        format(msg, sizeof(msg), "[A] %s: %s", name, text[1]);
        for(new i = 0; i < MAX_PLAYERS; i++)
        {
            if(IsPlayerConnected(i) && (gAdmin[i] >= 1 || IsPlayerAdmin(i))) SendClientMessage(i, COLOR_ORANGE, msg);
        }
        return 0;
    }
    return 1;
}

public OnDialogResponse(playerid, dialogid, response, listitem, inputtext[])
{
    if(dialogid == DIALOG_AUTH_REGISTER)
    {
        if(!response)
        {
            Kick(playerid);
            return 1;
        }
        if(strlen(inputtext) < 4 || strlen(inputtext) > 24)
        {
            SendClientMessage(playerid, COLOR_RED, "Пароль должен содержать от 4 до 24 символов.");
            ShowPlayerDialog(playerid, DIALOG_AUTH_REGISTER, DIALOG_STYLE_PASSWORD, "BLACK CRUSH | Регистрация", "Придумайте пароль (4-24 символа):", "Создать", "Выход");
            return 1;
        }
        gPasswordHash[playerid] = PasswordHash(inputtext);
        gLogged[playerid] = true;
        ResetProgress(playerid);
        GivePlayerMoney(playerid, 500000);
        SetPlayerScore(playerid, 1);
        SaveAccount(playerid);
        SendClientMessage(playerid, COLOR_GREEN, "Аккаунт создан. Стартовый баланс: 500.000$.");
        SpawnPlayer(playerid);
        return 1;
    }
    if(dialogid == DIALOG_AUTH_LOGIN)
    {
        if(!response)
        {
            Kick(playerid);
            return 1;
        }
        if(PasswordHash(inputtext) != gPasswordHash[playerid])
        {
            gLoginAttempts[playerid]++;
            if(gLoginAttempts[playerid] >= MAX_LOGIN_ATTEMPTS)
            {
                SendClientMessage(playerid, COLOR_RED, "Слишком много неверных попыток входа.");
                Kick(playerid);
                return 1;
            }
            SendClientMessage(playerid, COLOR_RED, "Неверный пароль.");
            ShowPlayerDialog(playerid, DIALOG_AUTH_LOGIN, DIALOG_STYLE_PASSWORD, "BLACK CRUSH | Вход", "Введите пароль:", "Войти", "Выход");
            return 1;
        }
        gLogged[playerid] = true;
        gSessionStart[playerid] = GetTickCount();
        SendClientMessage(playerid, COLOR_GREEN, "Авторизация успешна.");
        SpawnPlayer(playerid);
        return 1;
    }
    if(!gLogged[playerid]) return 1;
    if(dialogid == DIALOG_MENU)
    {
        if(!response) return 1;
        switch(listitem)
        {
            case 0: ShowStats(playerid);
            case 1: ShowCommands(playerid);
            case 2: ShowSettings(playerid);
            case 3: ShowSecurity(playerid);
            case 4: ShowPlayerDialog(playerid, DIALOG_REPORT, DIALOG_STYLE_INPUT, "Связь с администрацией", "Опишите проблему или вопрос:", "Отправить", "Назад");
            case 5: ShowPlayerDialog(playerid, DIALOG_IMPROVEMENTS, DIALOG_STYLE_MSGBOX, "Улучшения", "Система проекта построена на чистом ядре без обязательных сторонних плагинов.\nНовые системы можно добавлять прямо в PWN.", "Назад", "");
            case 6: ShowRules(playerid);
            case 7: ShowPlayerDialog(playerid, DIALOG_CHANGENAME, DIALOG_STYLE_INPUT, "Изменить имя", "Введите новый ник (3-20 символов, A-Z, a-z, 0-9, _):", "Изменить", "Назад");
            case 8: ShowExtra(playerid);
            case 9: ShowPlayerDialog(playerid, DIALOG_PROMO, DIALOG_STYLE_INPUT, "Промокод", "Введите промокод:", "Активировать", "Назад");
            case 10: ShowAchievements(playerid);
            case 11: ShowQuests(playerid);
            case 12: ShowDMMenu(playerid);
        }
        return 1;
    }
    if(dialogid == DIALOG_SETTINGS)
    {
        if(!response)
        {
            ShowMainMenu(playerid);
            return 1;
        }
        if(listitem == 0)
        {
            gPMEnabled[playerid] = !gPMEnabled[playerid];
            if(gPMEnabled[playerid]) SendClientMessage(playerid, COLOR_GREEN, "Личные сообщения включены.");
            else SendClientMessage(playerid, COLOR_GREEN, "Личные сообщения отключены.");
            SaveAccount(playerid);
        }
        else if(listitem == 1)
        {
            SetPlayerColor(playerid, COLOR_WHITE);
            SendClientMessage(playerid, COLOR_GREEN, "Цвет ника сброшен.");
        }
        ShowSettings(playerid);
        return 1;
    }
    if(dialogid == DIALOG_SECURITY)
    {
        if(!response)
        {
            ShowMainMenu(playerid);
            return 1;
        }
        if(strlen(inputtext) < 4 || strlen(inputtext) > 24)
        {
            SendClientMessage(playerid, COLOR_RED, "Новый пароль должен быть от 4 до 24 символов.");
            ShowSecurity(playerid);
            return 1;
        }
        gPasswordHash[playerid] = PasswordHash(inputtext);
        SaveAccount(playerid);
        SendClientMessage(playerid, COLOR_GREEN, "Пароль изменён.");
        ShowMainMenu(playerid);
        return 1;
    }
    if(dialogid == DIALOG_REPORT)
    {
        if(!response)
        {
            ShowMainMenu(playerid);
            return 1;
        }
        if(strlen(inputtext) < 5)
        {
            SendClientMessage(playerid, COLOR_RED, "Сообщение слишком короткое.");
            return 1;
        }
        format(gReportText[playerid], 128, "%s", inputtext);
        gReportOpen[playerid] = true;
        SendClientMessage(playerid, COLOR_GREEN, "Обращение отправлено администрации.");
        NotifyAdminsReport(playerid);
        return 1;
    }
    if(dialogid == DIALOG_IMPROVEMENTS || dialogid == DIALOG_RULES || dialogid == DIALOG_STATS || dialogid == DIALOG_COMMANDS || dialogid == DIALOG_ACHIEVEMENTS || dialogid == DIALOG_QUESTS)
    {
        ShowMainMenu(playerid);
        return 1;
    }
    if(dialogid == DIALOG_CHANGENAME)
    {
        if(!response)
        {
            ShowMainMenu(playerid);
            return 1;
        }
        if(!IsValidNick(inputtext))
        {
            SendClientMessage(playerid, COLOR_RED, "Некорректный ник. Используйте 3-20 символов: A-Z, a-z, 0-9, _.");
            return 1;
        }
        if(AccountExistsByName(inputtext))
        {
            SendClientMessage(playerid, COLOR_RED, "Аккаунт с таким именем уже существует.");
            return 1;
        }
        new oldFile[64];
        GetAccountFile(playerid, oldFile, sizeof(oldFile));
        if(SetPlayerName(playerid, inputtext) != 1)
        {
            SendClientMessage(playerid, COLOR_RED, "Сервер не принял этот ник.");
            return 1;
        }
        SaveAccount(playerid);
        if(fexist(oldFile)) fremove(oldFile);
        SendClientMessage(playerid, COLOR_GREEN, "Имя аккаунта изменено.");
        return 1;
    }
    if(dialogid == DIALOG_EXTRA)
    {
        if(!response)
        {
            ShowMainMenu(playerid);
            return 1;
        }
        switch(listitem)
        {
            case 0: ShowBank(playerid);
            case 1: ClaimDaily(playerid);
            case 2: ShowJob(playerid);
            case 3:
            {
                SetPlayerHealth(playerid, 100.0);
                SendClientMessage(playerid, COLOR_GREEN, "Здоровье восстановлено.");
            }
        }
        return 1;
    }
    if(dialogid == DIALOG_PROMO)
    {
        if(!response)
        {
            ShowMainMenu(playerid);
            return 1;
        }
        if(gPromoUsed[playerid])
        {
            SendClientMessage(playerid, COLOR_RED, "Вы уже активировали стартовый промокод.");
            return 1;
        }
        if(!strcmp(inputtext, "BLACKCRUSH", true) || !strcmp(inputtext, "UPDATE", true))
        {
            GivePlayerMoney(playerid, 50000000);
            gDonate[playerid] += 3000;
            gPromoUsed[playerid] = 1;
            SaveAccount(playerid);
            SendClientMessage(playerid, COLOR_YELLOW, "Промокод активирован: +50.000.000$ и +3.000 доната.");
        }
        else SendClientMessage(playerid, COLOR_RED, "Промокод не найден.");
        return 1;
    }
    if(dialogid == DIALOG_DM)
    {
        if(!response)
        {
            ShowMainMenu(playerid);
            return 1;
        }
        if(listitem == 0)
        {
            if(gInDM[playerid]) LeaveDM(playerid);
            else EnterDM(playerid);
        }
        else if(listitem == 1) ShowDMTop(playerid);
        return 1;
    }
    if(dialogid == DIALOG_BANK)
    {
        if(!response)
        {
            ShowExtra(playerid);
            return 1;
        }
        if(listitem == 0) ShowPlayerDialog(playerid, DIALOG_BANK_DEPOSIT, DIALOG_STYLE_INPUT, "Банк | Пополнить", "Введите сумму:", "Внести", "Назад");
        else if(listitem == 1) ShowPlayerDialog(playerid, DIALOG_BANK_WITHDRAW, DIALOG_STYLE_INPUT, "Банк | Снять", "Введите сумму:", "Снять", "Назад");
        return 1;
    }
    if(dialogid == DIALOG_BANK_DEPOSIT)
    {
        if(!response)
        {
            ShowBank(playerid);
            return 1;
        }
        new amount = strval(inputtext);
        if(amount <= 0 || amount > GetPlayerMoney(playerid))
        {
            SendClientMessage(playerid, COLOR_RED, "Недостаточно денег или неверная сумма.");
            return 1;
        }
        GivePlayerMoney(playerid, -amount);
        gBank[playerid] += amount;
        SaveAccount(playerid);
        ShowBank(playerid);
        return 1;
    }
    if(dialogid == DIALOG_BANK_WITHDRAW)
    {
        if(!response)
        {
            ShowBank(playerid);
            return 1;
        }
        new amount = strval(inputtext);
        if(amount <= 0 || amount > gBank[playerid])
        {
            SendClientMessage(playerid, COLOR_RED, "Недостаточно средств в банке или неверная сумма.");
            return 1;
        }
        gBank[playerid] -= amount;
        GivePlayerMoney(playerid, amount);
        SaveAccount(playerid);
        ShowBank(playerid);
        return 1;
    }
    if(dialogid == DIALOG_JOB)
    {
        if(!response)
        {
            ShowExtra(playerid);
            return 1;
        }
        if(!gCourier[playerid]) StartCourier(playerid);
        else StopCourier(playerid);
        return 1;
    }
    return 1;
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if(!gLogged[playerid])
    {
        SendClientMessage(playerid, COLOR_RED, "Сначала войдите в аккаунт.");
        return 1;
    }
    if(!strcmp(cmdtext, "/menu", true) || !strcmp(cmdtext, "/mm", true) || !strcmp(cmdtext, "/mn", true)) { ShowMainMenu(playerid); return 1; }
    if(!strcmp(cmdtext, "/stats", true)) { ShowStats(playerid); return 1; }
    if(!strcmp(cmdtext, "/help", true) || !strcmp(cmdtext, "/cmds", true)) { ShowCommands(playerid); return 1; }
    if(!strcmp(cmdtext, "/rules", true)) { ShowRules(playerid); return 1; }
    if(!strcmp(cmdtext, "/dm", true)) { ShowDMMenu(playerid); return 1; }
    if(!strcmp(cmdtext, "/dmexit", true)) { if(gInDM[playerid]) LeaveDM(playerid); else SendClientMessage(playerid, COLOR_RED, "Вы не на DM-зоне."); return 1; }
    if(!strcmp(cmdtext, "/dmtop", true)) { ShowDMTop(playerid); return 1; }
    if(!strcmp(cmdtext, "/job", true)) { ShowJob(playerid); return 1; }
    if(!strcmp(cmdtext, "/daily", true)) { ClaimDaily(playerid); return 1; }
    if(!strcmp(cmdtext, "/reports", true)) { if(!IsAdminAccess(playerid, 1)) return 1; ShowReports(playerid); return 1; }
    if(!strcmp(cmdtext, "/ahelp", true)) { if(!IsAdminAccess(playerid, 1)) return 1; ShowAdminHelp(playerid); return 1; }
    if(!strncmp(cmdtext, "/pm ", 4, true)) { HandlePM(playerid, cmdtext[4]); return 1; }
    if(!strncmp(cmdtext, "/report ", 8, true))
    {
        if(strlen(cmdtext[8]) < 5) { SendClientMessage(playerid, COLOR_RED, "Использование: /report текст"); return 1; }
        format(gReportText[playerid], 128, "%s", cmdtext[8]);
        gReportOpen[playerid] = true;
        SendClientMessage(playerid, COLOR_GREEN, "Обращение отправлено администрации.");
        NotifyAdminsReport(playerid);
        return 1;
    }
    if(!strncmp(cmdtext, "/ans ", 5, true)) { if(!IsAdminAccess(playerid, 1)) return 1; HandleAnswer(playerid, cmdtext[5]); return 1; }
    if(!strncmp(cmdtext, "/setadmin ", 10, true))
    {
        if(!IsPlayerAdmin(playerid)) { SendClientMessage(playerid, COLOR_RED, "Команда доступна только RCON-администратору."); return 1; }
        HandleSetAdmin(playerid, cmdtext[10]);
        return 1;
    }
    if(!strncmp(cmdtext, "/goto ", 6, true)) { if(!IsAdminAccess(playerid, 1)) return 1; AdminGoto(playerid, cmdtext[6]); return 1; }
    if(!strncmp(cmdtext, "/gethere ", 9, true)) { if(!IsAdminAccess(playerid, 2)) return 1; AdminGetHere(playerid, cmdtext[9]); return 1; }
    if(!strncmp(cmdtext, "/kickid ", 8, true)) { if(!IsAdminAccess(playerid, 2)) return 1; AdminKick(playerid, cmdtext[8]); return 1; }
    if(!strncmp(cmdtext, "/setmoney ", 10, true)) { if(!IsAdminAccess(playerid, 4)) return 1; AdminSetMoney(playerid, cmdtext[10]); return 1; }
    if(!strncmp(cmdtext, "/veh ", 5, true)) { if(!IsAdminAccess(playerid, 3)) return 1; AdminVehicle(playerid, cmdtext[5]); return 1; }
    SendClientMessage(playerid, COLOR_GREY, "Неизвестная команда. Используйте /help.");
    return 1;
}

stock ResetRuntime(playerid)
{
    gLogged[playerid] = false;
    gPasswordHash[playerid] = 0;
    gBank[playerid] = 0;
    gDonate[playerid] = 0;
    gAdmin[playerid] = 0;
    gKills[playerid] = 0;
    gDeaths[playerid] = 0;
    gDMKills[playerid] = 0;
    gPromoUsed[playerid] = 0;
    gLastDaily[playerid] = 0;
    gCourierDone[playerid] = 0;
    gQuestKills[playerid] = 0;
    gPMEnabled[playerid] = true;
    gLoginAttempts[playerid] = 0;
    gSessionStart[playerid] = GetTickCount();
    gInDM[playerid] = false;
    gCourier[playerid] = false;
    gCourierStep[playerid] = 0;
    gReportOpen[playerid] = false;
    gReportText[playerid][0] = EOS;
    return 1;
}

stock ResetProgress(playerid)
{
    gBank[playerid] = 0;
    gDonate[playerid] = 0;
    gAdmin[playerid] = 0;
    gKills[playerid] = 0;
    gDeaths[playerid] = 0;
    gDMKills[playerid] = 0;
    gPromoUsed[playerid] = 0;
    gLastDaily[playerid] = 0;
    gCourierDone[playerid] = 0;
    gQuestKills[playerid] = 0;
    gPMEnabled[playerid] = true;
    return 1;
}

stock ShowAuthDialog(playerid)
{
    if(AccountExists(playerid))
    {
        if(!LoadAccount(playerid))
        {
            SendClientMessage(playerid, COLOR_RED, "Ошибка чтения аккаунта. Обратитесь к администрации.");
            Kick(playerid);
            return 1;
        }
        ShowPlayerDialog(playerid, DIALOG_AUTH_LOGIN, DIALOG_STYLE_PASSWORD, "BLACK CRUSH | Вход", "Введите пароль:", "Войти", "Выход");
    }
    else ShowPlayerDialog(playerid, DIALOG_AUTH_REGISTER, DIALOG_STYLE_PASSWORD, "BLACK CRUSH | Регистрация", "Придумайте пароль (4-24 символа):", "Создать", "Выход");
    return 1;
}

stock ShowMainMenu(playerid)
{
    ShowPlayerDialog(playerid, DIALOG_MENU, DIALOG_STYLE_LIST, "{0099CC}BLACK CRUSH | Меню игрока", "1. Статистика\n2. Список команд\n3. Личные настройки\n4. Настройки безопасности\n5. Связь с администрацией\n6. Улучшения\n7. Правила сервера\n8. Изменить имя\n9. Дополнительно\n{FFFF00}10. Активация промокода\n{FFFFFF}11. Достижения\n12. Квесты\n{FF4444}13. DM зона", "Выбрать", "Закрыть");
    return 1;
}

stock ShowStats(playerid)
{
    new name[MAX_PLAYER_NAME], info[768], sessionMinutes;
    GetPlayerName(playerid, name, sizeof(name));
    sessionMinutes = (GetTickCount() - gSessionStart[playerid]) / 60000;
    format(info, sizeof(info), "Ник: %s\nУровень: %d\nНаличные: %d$\nБанк: %d$\nДонат: %d\nАдмин-уровень: %d\nУбийства: %d\nСмерти: %d\nDM убийства: %d\nКурьерских маршрутов: %d\nСессия: %d мин.", name, GetPlayerScore(playerid), GetPlayerMoney(playerid), gBank[playerid], gDonate[playerid], gAdmin[playerid], gKills[playerid], gDeaths[playerid], gDMKills[playerid], gCourierDone[playerid], sessionMinutes);
    ShowPlayerDialog(playerid, DIALOG_STATS, DIALOG_STYLE_MSGBOX, "Статистика", info, "Назад", "");
    return 1;
}

stock ShowCommands(playerid)
{
    ShowPlayerDialog(playerid, DIALOG_COMMANDS, DIALOG_STYLE_MSGBOX, "Команды", "/menu /mm /mn - меню игрока\n/stats - статистика\n/help - команды\n/rules - правила\n/pm ID текст - личное сообщение\n/report текст - обращение\n/dm - DM зона\n/dmexit - выйти из DM\n/dmtop - онлайн-топ DM\n/job - работа курьером\n/daily - ежедневный бонус\n\nАдминистрация: /ahelp", "Назад", "");
    return 1;
}

stock ShowSettings(playerid)
{
    new info[256];
    if(gPMEnabled[playerid]) format(info, sizeof(info), "Личные сообщения: ВКЛ\nСбросить цвет ника");
    else format(info, sizeof(info), "Личные сообщения: ВЫКЛ\nСбросить цвет ника");
    ShowPlayerDialog(playerid, DIALOG_SETTINGS, DIALOG_STYLE_LIST, "Личные настройки", info, "Изменить", "Назад");
    return 1;
}

stock ShowSecurity(playerid) { ShowPlayerDialog(playerid, DIALOG_SECURITY, DIALOG_STYLE_PASSWORD, "Безопасность", "Введите новый пароль (4-24 символа):", "Сохранить", "Назад"); return 1; }

stock ShowRules(playerid)
{
    ShowPlayerDialog(playerid, DIALOG_RULES, DIALOG_STYLE_MSGBOX, "Правила сервера", "1. Запрещены читы, вредоносные модификации и обход ограничений.\n2. Запрещено намеренно мешать работе сервера.\n3. Запрещены оскорбления и спам.\n4. Запрещена выдача себя за администрацию.\n5. Решения администрации можно обжаловать через /report.", "Назад", "");
    return 1;
}

stock ShowExtra(playerid) { ShowPlayerDialog(playerid, DIALOG_EXTRA, DIALOG_STYLE_LIST, "Дополнительно", "Банк\nЕжедневный бонус\nРабота: курьер\nВосстановить здоровье", "Выбрать", "Назад"); return 1; }

stock ShowAchievements(playerid)
{
    new info[512], a0[2], a1[2], a2[2], a3[2], a4[2];
    format(a0, 2, "+");
    if(gKills[playerid] >= 1) format(a1, 2, "+"); else format(a1, 2, "-");
    if(gDMKills[playerid] >= 10) format(a2, 2, "+"); else format(a2, 2, "-");
    if((GetPlayerMoney(playerid) + gBank[playerid]) >= 1000000) format(a3, 2, "+"); else format(a3, 2, "-");
    if(gCourierDone[playerid] >= 5) format(a4, 2, "+"); else format(a4, 2, "-");
    format(info, sizeof(info), "[%s] Первый вход\n[%s] Первое убийство\n[%s] 10 убийств на DM\n[%s] Миллионер\n[%s] 5 маршрутов курьера", a0, a1, a2, a3, a4);
    ShowPlayerDialog(playerid, DIALOG_ACHIEVEMENTS, DIALOG_STYLE_MSGBOX, "Достижения", info, "Назад", "");
    return 1;
}

stock ShowQuests(playerid)
{
    new info[512], qk = gQuestKills[playerid], qc = gCourierDone[playerid];
    if(qk > 5) qk = 5;
    if(qc > 3) qc = 3;
    format(info, sizeof(info), "Боевой квест: совершить 5 убийств. Прогресс: %d/5\nРабочий квест: выполнить 3 маршрута курьера. Прогресс: %d/3", qk, qc);
    ShowPlayerDialog(playerid, DIALOG_QUESTS, DIALOG_STYLE_MSGBOX, "Квесты", info, "Назад", "");
    return 1;
}

stock ShowDMMenu(playerid)
{
    new info[192];
    if(gInDM[playerid]) format(info, sizeof(info), "Покинуть DM зону\nОнлайн-топ DM");
    else format(info, sizeof(info), "Войти в DM зону\nОнлайн-топ DM");
    ShowPlayerDialog(playerid, DIALOG_DM, DIALOG_STYLE_LIST, "DeathMatch Zone", info, "Выбрать", "Назад");
    return 1;
}

stock ShowBank(playerid)
{
    new title[96];
    format(title, sizeof(title), "Банк | Баланс: %d$", gBank[playerid]);
    ShowPlayerDialog(playerid, DIALOG_BANK, DIALOG_STYLE_LIST, title, "Внести деньги\nСнять деньги", "Выбрать", "Назад");
    return 1;
}

stock ShowJob(playerid)
{
    new text[256];
    if(gCourier[playerid]) format(text, sizeof(text), "Вы работаете курьером. Текущая точка: %d/%d.\nНажмите кнопку, чтобы завершить смену.", gCourierStep[playerid] + 1, sizeof(gCourierCP));
    else format(text, sizeof(text), "Работа курьером:\n- 15.000$ за каждую точку\n- 75.000$ бонус за маршрут\n\nНачать смену?");
    if(gCourier[playerid]) ShowPlayerDialog(playerid, DIALOG_JOB, DIALOG_STYLE_MSGBOX, "Работа | Курьер", text, "Завершить", "Назад");
    else ShowPlayerDialog(playerid, DIALOG_JOB, DIALOG_STYLE_MSGBOX, "Работа | Курьер", text, "Начать", "Назад");
    return 1;
}

stock ShowAdminHelp(playerid)
{
    ShowPlayerDialog(playerid, DIALOG_ADMIN_HELP, DIALOG_STYLE_MSGBOX, "Админ-команды", "@текст - админ-чат\n/reports - открытые репорты\n/ans ID текст - ответить\n/goto ID - телепорт к игроку\n/gethere ID - телепортировать игрока\n/kickid ID - кикнуть\n/veh MODEL - создать авто\n/setmoney ID SUM - установить деньги\n/setadmin ID LEVEL - только RCON", "Закрыть", "");
    return 1;
}

stock EnterDM(playerid)
{
    if(gInDM[playerid]) return 1;
    GetPlayerPos(playerid, gOldX[playerid], gOldY[playerid], gOldZ[playerid]);
    GetPlayerFacingAngle(playerid, gOldA[playerid]);
    GetPlayerHealth(playerid, gOldHealth[playerid]);
    GetPlayerArmour(playerid, gOldArmour[playerid]);
    gOldInterior[playerid] = GetPlayerInterior(playerid);
    gOldWorld[playerid] = GetPlayerVirtualWorld(playerid);
    SaveWeapons(playerid);
    gInDM[playerid] = true;
    SpawnDM(playerid);
    SendClientMessage(playerid, COLOR_RED, "Вы вошли на DM ZONE. За убийство: 25.000$. Выход: /dmexit.");
    return 1;
}

stock SpawnDM(playerid)
{
    new s = random(sizeof(gDMSpawns));
    SetPlayerVirtualWorld(playerid, DM_WORLD);
    SetPlayerInterior(playerid, 0);
    SetPlayerPos(playerid, gDMSpawns[s][0], gDMSpawns[s][1], gDMSpawns[s][2]);
    SetPlayerFacingAngle(playerid, gDMSpawns[s][3]);
    SetCameraBehindPlayer(playerid);
    ResetPlayerWeapons(playerid);
    GivePlayerWeapon(playerid, 24, 140);
    GivePlayerWeapon(playerid, 25, 80);
    GivePlayerWeapon(playerid, 31, 300);
    SetPlayerHealth(playerid, 100.0);
    SetPlayerArmour(playerid, 100.0);
    return 1;
}

stock LeaveDM(playerid)
{
    if(!gInDM[playerid]) return 1;
    gInDM[playerid] = false;
    SetPlayerVirtualWorld(playerid, gOldWorld[playerid]);
    SetPlayerInterior(playerid, gOldInterior[playerid]);
    SetPlayerPos(playerid, gOldX[playerid], gOldY[playerid], gOldZ[playerid]);
    SetPlayerFacingAngle(playerid, gOldA[playerid]);
    SetPlayerHealth(playerid, gOldHealth[playerid]);
    SetPlayerArmour(playerid, gOldArmour[playerid]);
    RestoreWeapons(playerid);
    SetCameraBehindPlayer(playerid);
    SendClientMessage(playerid, COLOR_GREEN, "Вы покинули DM ZONE.");
    SaveAccount(playerid);
    return 1;
}

stock SaveWeapons(playerid)
{
    for(new slot = 0; slot < 13; slot++) GetPlayerWeaponData(playerid, slot, gOldWeapon[playerid][slot], gOldAmmo[playerid][slot]);
    return 1;
}

stock RestoreWeapons(playerid)
{
    ResetPlayerWeapons(playerid);
    for(new slot = 0; slot < 13; slot++) if(gOldWeapon[playerid][slot] > 0 && gOldAmmo[playerid][slot] > 0) GivePlayerWeapon(playerid, gOldWeapon[playerid][slot], gOldAmmo[playerid][slot]);
    return 1;
}

stock ShowDMTop(playerid)
{
    new best[5] = {-1, -1, -1, -1, -1};
    for(new p = 0; p < MAX_PLAYERS; p++)
    {
        if(!IsPlayerConnected(p) || !gLogged[p]) continue;
        for(new pos = 0; pos < 5; pos++)
        {
            if(best[pos] == -1 || gDMKills[p] > gDMKills[best[pos]])
            {
                for(new move = 4; move > pos; move--) best[move] = best[move - 1];
                best[pos] = p;
                break;
            }
        }
    }
    new text[512], line[96], name[MAX_PLAYER_NAME];
    format(text, sizeof(text), "Топ игроков онлайн по DM-убийствам:\n");
    for(new i = 0; i < 5; i++)
    {
        if(best[i] == -1) continue;
        GetPlayerName(best[i], name, sizeof(name));
        format(line, sizeof(line), "%d. %s - %d\n", i + 1, name, gDMKills[best[i]]);
        strcat(text, line);
    }
    ShowPlayerDialog(playerid, 1099, DIALOG_STYLE_MSGBOX, "DM TOP", text, "Закрыть", "");
    return 1;
}

stock StartCourier(playerid)
{
    if(gInDM[playerid]) { SendClientMessage(playerid, COLOR_RED, "Сначала выйдите из DM-зоны."); return 1; }
    gCourier[playerid] = true;
    gCourierStep[playerid] = 0;
    SetCourierCheckpoint(playerid);
    SendClientMessage(playerid, COLOR_YELLOW, "Смена курьера началась. Следуйте к красной точке.");
    return 1;
}

stock StopCourier(playerid)
{
    gCourier[playerid] = false;
    gCourierStep[playerid] = 0;
    DisablePlayerCheckpoint(playerid);
    SendClientMessage(playerid, COLOR_GREY, "Смена курьера завершена.");
    return 1;
}

stock SetCourierCheckpoint(playerid)
{
    new s = gCourierStep[playerid];
    if(s < 0 || s >= sizeof(gCourierCP)) return 1;
    SetPlayerCheckpoint(playerid, gCourierCP[s][0], gCourierCP[s][1], gCourierCP[s][2], 4.0);
    return 1;
}

stock ClaimDaily(playerid)
{
    new y, m, d;
    getdate(y, m, d);
    new today = y * 10000 + m * 100 + d;
    if(gLastDaily[playerid] == today) { SendClientMessage(playerid, COLOR_RED, "Сегодня вы уже получали ежедневный бонус."); return 1; }
    gLastDaily[playerid] = today;
    GivePlayerMoney(playerid, 250000);
    gDonate[playerid] += 50;
    SaveAccount(playerid);
    SendClientMessage(playerid, COLOR_YELLOW, "Ежедневный бонус: +250.000$ и +50 доната.");
    return 1;
}

stock NotifyAdminsReport(playerid)
{
    new name[MAX_PLAYER_NAME], msg[180];
    GetPlayerName(playerid, name, sizeof(name));
    format(msg, sizeof(msg), "[REPORT] ID %d %s: %s", playerid, name, gReportText[playerid]);
    for(new i = 0; i < MAX_PLAYERS; i++) if(IsPlayerConnected(i) && (gAdmin[i] >= 1 || IsPlayerAdmin(i))) SendClientMessage(i, COLOR_ORANGE, msg);
    return 1;
}

stock ShowReports(playerid)
{
    new text[1024], line[180], name[MAX_PLAYER_NAME], count;
    format(text, sizeof(text), "Открытые обращения:\n");
    for(new i = 0; i < MAX_PLAYERS; i++)
    {
        if(!IsPlayerConnected(i) || !gReportOpen[i]) continue;
        GetPlayerName(i, name, sizeof(name));
        format(line, sizeof(line), "ID %d | %s: %s\n", i, name, gReportText[i]);
        if(strlen(text) + strlen(line) < sizeof(text) - 1) strcat(text, line);
        count++;
    }
    if(count == 0) strcat(text, "Нет открытых обращений.");
    ShowPlayerDialog(playerid, DIALOG_ADMIN_REPORTS, DIALOG_STYLE_MSGBOX, "Репорты", text, "Закрыть", "");
    return 1;
}

stock HandleAnswer(playerid, params[])
{
    new idToken[16], text[128];
    if(!SplitFirst(params, idToken, sizeof(idToken), text, sizeof(text))) { SendClientMessage(playerid, COLOR_RED, "Использование: /ans ID текст"); return 1; }
    new target = strval(idToken);
    if(!IsPlayerConnected(target) || !gReportOpen[target]) { SendClientMessage(playerid, COLOR_RED, "У этого игрока нет открытого обращения."); return 1; }
    new adminName[MAX_PLAYER_NAME], msg[180];
    GetPlayerName(playerid, adminName, sizeof(adminName));
    format(msg, sizeof(msg), "Ответ администратора %s: %s", adminName, text);
    SendClientMessage(target, COLOR_GREEN, msg);
    SendClientMessage(playerid, COLOR_GREEN, "Ответ отправлен.");
    gReportOpen[target] = false;
    return 1;
}

stock HandlePM(playerid, params[])
{
    new idToken[16], text[128];
    if(!SplitFirst(params, idToken, sizeof(idToken), text, sizeof(text))) { SendClientMessage(playerid, COLOR_RED, "Использование: /pm ID текст"); return 1; }
    new target = strval(idToken);
    if(!IsPlayerConnected(target) || !gLogged[target] || target == playerid) { SendClientMessage(playerid, COLOR_RED, "Игрок не найден."); return 1; }
    if(!gPMEnabled[target]) { SendClientMessage(playerid, COLOR_RED, "Игрок отключил личные сообщения."); return 1; }
    new name[MAX_PLAYER_NAME], msg[180];
    GetPlayerName(playerid, name, sizeof(name));
    format(msg, sizeof(msg), "[PM от %s(%d)] %s", name, playerid, text);
    SendClientMessage(target, COLOR_PURPLE, msg);
    GetPlayerName(target, name, sizeof(name));
    format(msg, sizeof(msg), "[PM для %s(%d)] %s", name, target, text);
    SendClientMessage(playerid, COLOR_PURPLE, msg);
    return 1;
}

stock HandleSetAdmin(playerid, params[])
{
    new idToken[16], levelToken[16];
    if(!SplitFirst(params, idToken, sizeof(idToken), levelToken, sizeof(levelToken))) { SendClientMessage(playerid, COLOR_RED, "Использование: /setadmin ID LEVEL"); return 1; }
    new target = strval(idToken), level = strval(levelToken);
    if(!IsPlayerConnected(target) || !gLogged[target] || level < 0 || level > 5) { SendClientMessage(playerid, COLOR_RED, "Неверный ID или уровень 0-5."); return 1; }
    gAdmin[target] = level;
    SaveAccount(target);
    new msg[96];
    format(msg, sizeof(msg), "Админ-уровень игрока %d установлен на %d.", target, level);
    SendClientMessage(playerid, COLOR_GREEN, msg);
    SendClientMessage(target, COLOR_YELLOW, "Ваш административный уровень изменён.");
    return 1;
}

stock AdminGoto(playerid, params[])
{
    new target = strval(params);
    if(!IsPlayerConnected(target)) { SendClientMessage(playerid, COLOR_RED, "Игрок не найден."); return 1; }
    new Float:x, Float:y, Float:z;
    GetPlayerPos(target, x, y, z);
    SetPlayerInterior(playerid, GetPlayerInterior(target));
    SetPlayerVirtualWorld(playerid, GetPlayerVirtualWorld(target));
    SetPlayerPos(playerid, x + 1.5, y, z);
    return 1;
}

stock AdminGetHere(playerid, params[])
{
    new target = strval(params);
    if(!IsPlayerConnected(target)) { SendClientMessage(playerid, COLOR_RED, "Игрок не найден."); return 1; }
    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);
    SetPlayerInterior(target, GetPlayerInterior(playerid));
    SetPlayerVirtualWorld(target, GetPlayerVirtualWorld(playerid));
    SetPlayerPos(target, x + 1.5, y, z);
    return 1;
}

stock AdminKick(playerid, params[])
{
    new target = strval(params);
    if(!IsPlayerConnected(target)) { SendClientMessage(playerid, COLOR_RED, "Игрок не найден."); return 1; }
    SendClientMessage(target, COLOR_RED, "Вы были отключены администратором.");
    Kick(target);
    return 1;
}

stock AdminSetMoney(playerid, params[])
{
    new idToken[16], amountToken[24];
    if(!SplitFirst(params, idToken, sizeof(idToken), amountToken, sizeof(amountToken))) { SendClientMessage(playerid, COLOR_RED, "Использование: /setmoney ID SUM"); return 1; }
    new target = strval(idToken), amount = strval(amountToken);
    if(!IsPlayerConnected(target) || amount < 0) { SendClientMessage(playerid, COLOR_RED, "Неверные параметры."); return 1; }
    ResetPlayerMoney(target);
    GivePlayerMoney(target, amount);
    SaveAccount(target);
    return 1;
}

stock AdminVehicle(playerid, params[])
{
    new model = strval(params);
    if(model < 400 || model > 611) { SendClientMessage(playerid, COLOR_RED, "Использование: /veh MODEL (400-611)"); return 1; }
    new Float:x, Float:y, Float:z, Float:a;
    GetPlayerPos(playerid, x, y, z);
    GetPlayerFacingAngle(playerid, a);
    new vehicleid = CreateVehicle(model, x + 3.0, y, z, a, random(126), random(126), 600);
    PutPlayerInVehicle(playerid, vehicleid, 0);
    return 1;
}

stock bool:IsAdminAccess(playerid, level)
{
    if(IsPlayerAdmin(playerid)) return true;
    if(gAdmin[playerid] >= level) return true;
    SendClientMessage(playerid, COLOR_RED, "Недостаточно прав администратора.");
    return false;
}

stock bool:SplitFirst(const source[], first[], firstSize, rest[], restSize)
{
    new len = strlen(source), pos = -1;
    for(new i = 0; i < len; i++) { if(source[i] == ' ') { pos = i; break; } }
    if(pos <= 0 || pos >= len - 1) return false;
    strmid(first, source, 0, pos, firstSize);
    strmid(rest, source, pos + 1, len, restSize);
    return true;
}

stock PasswordHash(const password[])
{
    new hash = 5381;
    for(new i = 0, len = strlen(password); i < len; i++) hash = ((hash << 5) + hash) ^ password[i];
    if(hash == 0) hash = 1;
    return hash;
}

stock GetAccountFile(playerid, file[], size)
{
    new name[MAX_PLAYER_NAME];
    GetPlayerName(playerid, name, sizeof(name));
    format(file, size, "bc_%s.ini", name);
    return 1;
}

stock GetAccountFileByName(const name[], file[], size) { format(file, size, "bc_%s.ini", name); return 1; }

stock bool:AccountExists(playerid)
{
    new file[64];
    GetAccountFile(playerid, file, sizeof(file));
    return fexist(file) != 0;
}

stock bool:AccountExistsByName(const name[])
{
    new file[64];
    GetAccountFileByName(name, file, sizeof(file));
    return fexist(file) != 0;
}

stock SaveAccount(playerid)
{
    if(!gLogged[playerid]) return 0;
    new file[64], line[96];
    GetAccountFile(playerid, file, sizeof(file));
    new File:h = fopen(file, io_write);
    if(!h) return 0;
    format(line, sizeof(line), "Password=%d\r\n", gPasswordHash[playerid]); fwrite(h, line);
    format(line, sizeof(line), "Money=%d\r\n", GetPlayerMoney(playerid)); fwrite(h, line);
    format(line, sizeof(line), "Bank=%d\r\n", gBank[playerid]); fwrite(h, line);
    format(line, sizeof(line), "Score=%d\r\n", GetPlayerScore(playerid)); fwrite(h, line);
    format(line, sizeof(line), "Donate=%d\r\n", gDonate[playerid]); fwrite(h, line);
    format(line, sizeof(line), "Admin=%d\r\n", gAdmin[playerid]); fwrite(h, line);
    format(line, sizeof(line), "Kills=%d\r\n", gKills[playerid]); fwrite(h, line);
    format(line, sizeof(line), "Deaths=%d\r\n", gDeaths[playerid]); fwrite(h, line);
    format(line, sizeof(line), "DMKills=%d\r\n", gDMKills[playerid]); fwrite(h, line);
    format(line, sizeof(line), "Promo=%d\r\n", gPromoUsed[playerid]); fwrite(h, line);
    format(line, sizeof(line), "Daily=%d\r\n", gLastDaily[playerid]); fwrite(h, line);
    format(line, sizeof(line), "Courier=%d\r\n", gCourierDone[playerid]); fwrite(h, line);
    format(line, sizeof(line), "QuestKills=%d\r\n", gQuestKills[playerid]); fwrite(h, line);
    format(line, sizeof(line), "PM=%d\r\n", gPMEnabled[playerid] ? 1 : 0); fwrite(h, line);
    fclose(h);
    return 1;
}

stock LoadAccount(playerid)
{
    new file[64], line[128];
    GetAccountFile(playerid, file, sizeof(file));
    new File:h = fopen(file, io_read);
    if(!h) return 0;
    ResetProgress(playerid);
    new money = 0, score = 1;
    while(fread(h, line, sizeof(line)))
    {
        if(strfind(line, "Password=", true) == 0) gPasswordHash[playerid] = strval(line[9]);
        else if(strfind(line, "Money=", true) == 0) money = strval(line[6]);
        else if(strfind(line, "Bank=", true) == 0) gBank[playerid] = strval(line[5]);
        else if(strfind(line, "Score=", true) == 0) score = strval(line[6]);
        else if(strfind(line, "Donate=", true) == 0) gDonate[playerid] = strval(line[7]);
        else if(strfind(line, "Admin=", true) == 0) gAdmin[playerid] = strval(line[6]);
        else if(strfind(line, "Kills=", true) == 0) gKills[playerid] = strval(line[6]);
        else if(strfind(line, "Deaths=", true) == 0) gDeaths[playerid] = strval(line[7]);
        else if(strfind(line, "DMKills=", true) == 0) gDMKills[playerid] = strval(line[8]);
        else if(strfind(line, "Promo=", true) == 0) gPromoUsed[playerid] = strval(line[6]);
        else if(strfind(line, "Daily=", true) == 0) gLastDaily[playerid] = strval(line[6]);
        else if(strfind(line, "Courier=", true) == 0) gCourierDone[playerid] = strval(line[8]);
        else if(strfind(line, "QuestKills=", true) == 0) gQuestKills[playerid] = strval(line[11]);
        else if(strfind(line, "PM=", true) == 0) gPMEnabled[playerid] = strval(line[3]) != 0;
    }
    fclose(h);
    ResetPlayerMoney(playerid);
    GivePlayerMoney(playerid, money);
    SetPlayerScore(playerid, score);
    return gPasswordHash[playerid] != 0;
}

stock bool:IsValidNick(const name[])
{
    new len = strlen(name);
    if(len < 3 || len > 20) return false;
    for(new i = 0; i < len; i++)
    {
        if((name[i] >= 'A' && name[i] <= 'Z') || (name[i] >= 'a' && name[i] <= 'z') || (name[i] >= '0' && name[i] <= '9') || name[i] == '_') continue;
        return false;
    }
    return true;
}
