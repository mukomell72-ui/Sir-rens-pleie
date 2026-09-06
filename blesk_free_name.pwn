#include <a_samp>

#define BLESK_DIALOG_NAME      (28910)
#define BLESK_DIALOG_INFO      (28911)
#define BLESK_DIALOG_SETTINGS  (28912)
#define BLESK_MAX_DISPLAY_NAME (32)
#define BLESK_COLOR_ACCENT     (0xE53935FF)
#define BLESK_COLOR_WHITE      (0xFFFFFFFF)
#define BLESK_COLOR_MUTED      (0xB8BDC8FF)

new DB:gBleskDB;
new gDisplayName[MAX_PLAYERS][BLESK_MAX_DISPLAY_NAME + 1];
new bool:gHasDisplayName[MAX_PLAYERS];
new bool:gMenuVisible[MAX_PLAYERS];
new bool:gMenuShownThisSession[MAX_PLAYERS];
new Text3D:gNameLabel[MAX_PLAYERS];

enum E_BLESK_TD
{
    BTD_OVERLAY,
    BTD_PANEL,
    BTD_ACCENT,
    BTD_TITLE,
    BTD_RUSSIA,
    BTD_SUBTITLE,
    BTD_PREVIEW,
    BTD_NAME_CAPTION,
    BTD_NAME_BOX,
    BTD_NAME_TEXT,
    BTD_PLAY_BOX,
    BTD_PLAY_TEXT,
    BTD_INFO_BOX,
    BTD_INFO_TEXT,
    BTD_SETTINGS_BOX,
    BTD_SETTINGS_TEXT,
    BTD_FOOTER,
    BTD_HINT,
    BTD_TOTAL
};
new PlayerText:gBleskTD[MAX_PLAYERS][BTD_TOTAL];

forward Blesk_ShowMenuDelayed(playerid);

stock Blesk_StrReplaceControlChars(string[])
{
    for(new i = 0, len = strlen(string); i < len; i++)
    {
        if(string[i] == '~') string[i] = '-';
        if(string[i] == '\r' || string[i] == '\n' || string[i] == '\t') string[i] = ' ';
    }
    return 1;
}

stock Blesk_TrimSpaces(string[])
{
    new len = strlen(string);
    while(len > 0 && string[len - 1] == ' ')
    {
        string[len - 1] = EOS;
        len--;
    }

    new start = 0;
    while(string[start] == ' ') start++;
    if(start > 0)
    {
        for(new i = 0; i <= len - start; i++) string[i] = string[i + start];
    }
    return 1;
}

stock Blesk_EscapeSQL(const input[], output[], size)
{
    new o = 0;
    for(new i = 0, len = strlen(input); i < len && o < size - 1; i++)
    {
        if(input[i] == '\'')
        {
            if(o >= size - 2) break;
            output[o++] = '\'';
            output[o++] = '\'';
        }
        else output[o++] = input[i];
    }
    output[o] = EOS;
    return 1;
}

stock Blesk_SaveName(playerid)
{
    if(gBleskDB == DB:0 || !gHasDisplayName[playerid]) return 0;

    new techName[MAX_PLAYER_NAME + 1], escTech[(MAX_PLAYER_NAME + 1) * 2];
    new escDisplay[(BLESK_MAX_DISPLAY_NAME + 1) * 2], query[256];
    GetPlayerName(playerid, techName, sizeof techName);
    Blesk_EscapeSQL(techName, escTech, sizeof escTech);
    Blesk_EscapeSQL(gDisplayName[playerid], escDisplay, sizeof escDisplay);

    format(query, sizeof query,
        "INSERT OR REPLACE INTO blesk_names (account_name, display_name) VALUES ('%s','%s')",
        escTech, escDisplay);
    new DBResult:res = db_query(gBleskDB, query);
    if(res) db_free_result(res);
    return 1;
}

stock Blesk_LoadName(playerid)
{
    gHasDisplayName[playerid] = false;
    gDisplayName[playerid][0] = EOS;
    if(gBleskDB == DB:0) return 0;

    new techName[MAX_PLAYER_NAME + 1], escTech[(MAX_PLAYER_NAME + 1) * 2], query[160];
    GetPlayerName(playerid, techName, sizeof techName);
    Blesk_EscapeSQL(techName, escTech, sizeof escTech);
    format(query, sizeof query, "SELECT display_name FROM blesk_names WHERE account_name='%s' LIMIT 1", escTech);

    new DBResult:res = db_query(gBleskDB, query);
    if(res)
    {
        if(db_num_rows(res) > 0)
        {
            db_get_field_assoc(res, "display_name", gDisplayName[playerid], BLESK_MAX_DISPLAY_NAME + 1);
            if(strlen(gDisplayName[playerid]) > 0) gHasDisplayName[playerid] = true;
        }
        db_free_result(res);
    }

    if(!gHasDisplayName[playerid]) GetPlayerName(playerid, gDisplayName[playerid], BLESK_MAX_DISPLAY_NAME + 1);
    return 1;
}

stock Blesk_RefreshNameLabel(playerid)
{
    if(gNameLabel[playerid] != Text3D:INVALID_3DTEXT_ID)
    {
        Delete3DTextLabel(gNameLabel[playerid]);
        gNameLabel[playerid] = Text3D:INVALID_3DTEXT_ID;
    }

    if(!gHasDisplayName[playerid]) return 1;

    gNameLabel[playerid] = Create3DTextLabel(gDisplayName[playerid], BLESK_COLOR_WHITE,
        0.0, 0.0, 0.0, 22.0, 0, 1);
    Attach3DTextLabelToPlayer(gNameLabel[playerid], playerid, 0.0, 0.0, 0.35);

    for(new i = 0; i < MAX_PLAYERS; i++)
    {
        if(IsPlayerConnected(i)) ShowPlayerNameTagForPlayer(i, playerid, false);
    }
    return 1;
}

stock Blesk_CreateTD(playerid)
{
    for(new i = 0; i < BTD_TOTAL; i++) gBleskTD[playerid][i] = PlayerText:INVALID_TEXT_DRAW;

    gBleskTD[playerid][BTD_OVERLAY] = CreatePlayerTextDraw(playerid, 0.0, 0.0, "LD_SPAC:white");
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_OVERLAY], 4);
    PlayerTextDrawTextSize(playerid, gBleskTD[playerid][BTD_OVERLAY], 640.0, 448.0);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_OVERLAY], 0x00000066);

    gBleskTD[playerid][BTD_PANEL] = CreatePlayerTextDraw(playerid, 394.0, 38.0, "LD_SPAC:white");
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_PANEL], 4);
    PlayerTextDrawTextSize(playerid, gBleskTD[playerid][BTD_PANEL], 212.0, 365.0);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_PANEL], 0x11141CEB);

    gBleskTD[playerid][BTD_ACCENT] = CreatePlayerTextDraw(playerid, 394.0, 38.0, "LD_SPAC:white");
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_ACCENT], 4);
    PlayerTextDrawTextSize(playerid, gBleskTD[playerid][BTD_ACCENT], 4.0, 365.0);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_ACCENT], BLESK_COLOR_ACCENT);

    gBleskTD[playerid][BTD_TITLE] = CreatePlayerTextDraw(playerid, 44.0, 44.0, "BLESK");
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_TITLE], 2);
    PlayerTextDrawLetterSize(playerid, gBleskTD[playerid][BTD_TITLE], 0.54, 2.25);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_TITLE], BLESK_COLOR_WHITE);
    PlayerTextDrawSetProportional(playerid, gBleskTD[playerid][BTD_TITLE], 1);

    gBleskTD[playerid][BTD_RUSSIA] = CreatePlayerTextDraw(playerid, 117.0, 49.0, "RUSSIA");
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_RUSSIA], 1);
    PlayerTextDrawLetterSize(playerid, gBleskTD[playerid][BTD_RUSSIA], 0.29, 1.55);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_RUSSIA], BLESK_COLOR_ACCENT);
    PlayerTextDrawSetProportional(playerid, gBleskTD[playerid][BTD_RUSSIA], 1);

    gBleskTD[playerid][BTD_SUBTITLE] = CreatePlayerTextDraw(playerid, 44.0, 72.0, "ТВОЯ ИСТОРИЯ НАЧИНАЕТСЯ ЗДЕСЬ");
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_SUBTITLE], 1);
    PlayerTextDrawLetterSize(playerid, gBleskTD[playerid][BTD_SUBTITLE], 0.18, 0.9);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_SUBTITLE], BLESK_COLOR_MUTED);
    PlayerTextDrawSetProportional(playerid, gBleskTD[playerid][BTD_SUBTITLE], 1);

    gBleskTD[playerid][BTD_PREVIEW] = CreatePlayerTextDraw(playerid, 62.0, 103.0, "preview");
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_PREVIEW], 5);
    PlayerTextDrawTextSize(playerid, gBleskTD[playerid][BTD_PREVIEW], 165.0, 255.0);
    PlayerTextDrawSetPreviewModel(playerid, gBleskTD[playerid][BTD_PREVIEW], GetPlayerSkin(playerid));
    PlayerTextDrawSetPreviewRot(playerid, gBleskTD[playerid][BTD_PREVIEW], -8.0, 0.0, 16.0, 1.05);
    PlayerTextDrawBackgroundColor(playerid, gBleskTD[playerid][BTD_PREVIEW], 0x00000000);

    gBleskTD[playerid][BTD_NAME_CAPTION] = CreatePlayerTextDraw(playerid, 419.0, 112.0, "ИГРОВОЕ ИМЯ");
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_NAME_CAPTION], 1);
    PlayerTextDrawLetterSize(playerid, gBleskTD[playerid][BTD_NAME_CAPTION], 0.20, 1.0);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_NAME_CAPTION], BLESK_COLOR_MUTED);

    gBleskTD[playerid][BTD_NAME_BOX] = CreatePlayerTextDraw(playerid, 419.0, 132.0, "LD_SPAC:white");
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_NAME_BOX], 4);
    PlayerTextDrawTextSize(playerid, gBleskTD[playerid][BTD_NAME_BOX], 167.0, 43.0);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_NAME_BOX], 0x232833FF);
    PlayerTextDrawSetSelectable(playerid, gBleskTD[playerid][BTD_NAME_BOX], true);

    gBleskTD[playerid][BTD_NAME_TEXT] = CreatePlayerTextDraw(playerid, 431.0, 145.0, gDisplayName[playerid]);
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_NAME_TEXT], 1);
    PlayerTextDrawLetterSize(playerid, gBleskTD[playerid][BTD_NAME_TEXT], 0.28, 1.25);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_NAME_TEXT], BLESK_COLOR_WHITE);
    PlayerTextDrawSetProportional(playerid, gBleskTD[playerid][BTD_NAME_TEXT], 1);

    gBleskTD[playerid][BTD_PLAY_BOX] = CreatePlayerTextDraw(playerid, 419.0, 195.0, "LD_SPAC:white");
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_PLAY_BOX], 4);
    PlayerTextDrawTextSize(playerid, gBleskTD[playerid][BTD_PLAY_BOX], 167.0, 49.0);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_PLAY_BOX], BLESK_COLOR_ACCENT);
    PlayerTextDrawSetSelectable(playerid, gBleskTD[playerid][BTD_PLAY_BOX], true);

    gBleskTD[playerid][BTD_PLAY_TEXT] = CreatePlayerTextDraw(playerid, 502.0, 211.0, "ИГРАТЬ");
    PlayerTextDrawAlignment(playerid, gBleskTD[playerid][BTD_PLAY_TEXT], 2);
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_PLAY_TEXT], 2);
    PlayerTextDrawLetterSize(playerid, gBleskTD[playerid][BTD_PLAY_TEXT], 0.32, 1.45);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_PLAY_TEXT], BLESK_COLOR_WHITE);

    gBleskTD[playerid][BTD_INFO_BOX] = CreatePlayerTextDraw(playerid, 419.0, 261.0, "LD_SPAC:white");
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_INFO_BOX], 4);
    PlayerTextDrawTextSize(playerid, gBleskTD[playerid][BTD_INFO_BOX], 79.0, 38.0);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_INFO_BOX], 0x232833FF);
    PlayerTextDrawSetSelectable(playerid, gBleskTD[playerid][BTD_INFO_BOX], true);

    gBleskTD[playerid][BTD_INFO_TEXT] = CreatePlayerTextDraw(playerid, 458.0, 274.0, "ИНФО");
    PlayerTextDrawAlignment(playerid, gBleskTD[playerid][BTD_INFO_TEXT], 2);
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_INFO_TEXT], 1);
    PlayerTextDrawLetterSize(playerid, gBleskTD[playerid][BTD_INFO_TEXT], 0.22, 1.1);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_INFO_TEXT], BLESK_COLOR_WHITE);

    gBleskTD[playerid][BTD_SETTINGS_BOX] = CreatePlayerTextDraw(playerid, 507.0, 261.0, "LD_SPAC:white");
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_SETTINGS_BOX], 4);
    PlayerTextDrawTextSize(playerid, gBleskTD[playerid][BTD_SETTINGS_BOX], 79.0, 38.0);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_SETTINGS_BOX], 0x232833FF);
    PlayerTextDrawSetSelectable(playerid, gBleskTD[playerid][BTD_SETTINGS_BOX], true);

    gBleskTD[playerid][BTD_SETTINGS_TEXT] = CreatePlayerTextDraw(playerid, 546.0, 274.0, "НАСТР.");
    PlayerTextDrawAlignment(playerid, gBleskTD[playerid][BTD_SETTINGS_TEXT], 2);
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_SETTINGS_TEXT], 1);
    PlayerTextDrawLetterSize(playerid, gBleskTD[playerid][BTD_SETTINGS_TEXT], 0.20, 1.1);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_SETTINGS_TEXT], BLESK_COLOR_WHITE);

    gBleskTD[playerid][BTD_FOOTER] = CreatePlayerTextDraw(playerid, 419.0, 337.0, "BLESK RUSSIA  |  SERVER #1");
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_FOOTER], 1);
    PlayerTextDrawLetterSize(playerid, gBleskTD[playerid][BTD_FOOTER], 0.17, 0.85);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_FOOTER], 0x7E8796FF);

    gBleskTD[playerid][BTD_HINT] = CreatePlayerTextDraw(playerid, 44.0, 390.0, "НИК МОЖНО МЕНЯТЬ ПРЯМО НА СЕРВЕРЕ — БЕЗ НОВОГО APK");
    PlayerTextDrawFont(playerid, gBleskTD[playerid][BTD_HINT], 1);
    PlayerTextDrawLetterSize(playerid, gBleskTD[playerid][BTD_HINT], 0.17, 0.85);
    PlayerTextDrawColor(playerid, gBleskTD[playerid][BTD_HINT], 0xAAB0BAFF);
    return 1;
}

stock Blesk_DestroyTD(playerid)
{
    for(new i = 0; i < BTD_TOTAL; i++)
    {
        if(gBleskTD[playerid][i] != PlayerText:INVALID_TEXT_DRAW)
        {
            PlayerTextDrawDestroy(playerid, gBleskTD[playerid][i]);
            gBleskTD[playerid][i] = PlayerText:INVALID_TEXT_DRAW;
        }
    }
    return 1;
}

stock Blesk_ShowMenu(playerid)
{
    if(!IsPlayerConnected(playerid) || gMenuVisible[playerid]) return 0;
    Blesk_DestroyTD(playerid);
    Blesk_CreateTD(playerid);
    for(new i = 0; i < BTD_TOTAL; i++) PlayerTextDrawShow(playerid, gBleskTD[playerid][i]);

    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);
    TogglePlayerControllable(playerid, false);
    InterpolateCameraPos(playerid, x + 20.0, y + 22.0, z + 11.0, x - 18.0, y + 15.0, z + 9.0, 11000, CAMERA_MOVE);
    InterpolateCameraLookAt(playerid, x, y, z + 1.2, x, y, z + 1.0, 11000, CAMERA_MOVE);
    SelectTextDraw(playerid, BLESK_COLOR_ACCENT);
    gMenuVisible[playerid] = true;
    return 1;
}

stock Blesk_HideMenu(playerid)
{
    if(!gMenuVisible[playerid]) return 1;
    CancelSelectTextDraw(playerid);
    for(new i = 0; i < BTD_TOTAL; i++)
        if(gBleskTD[playerid][i] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, gBleskTD[playerid][i]);
    SetCameraBehindPlayer(playerid);
    TogglePlayerControllable(playerid, true);
    gMenuVisible[playerid] = false;
    return 1;
}

stock Blesk_OpenNameDialog(playerid)
{
    CancelSelectTextDraw(playerid);
    ShowPlayerDialog(playerid, BLESK_DIALOG_NAME, DIALOG_STYLE_INPUT,
        "{E53935}BLESK RUSSIA {FFFFFF}— ИГРОВОЕ ИМЯ",
        "{FFFFFF}ВВЕДИТЕ ИМЯ, КОТОРОЕ БУДУТ ВИДЕТЬ ИГРОКИ.\n\n{B8BDC8}МОЖНО ПРОБЕЛЫ, РУССКИЙ ЯЗЫК И СИМВОЛЫ.\nИМЯ СОХРАНЯЕТСЯ НА СЕРВЕРЕ.",
        "СОХРАНИТЬ", "НАЗАД");
    return 1;
}

public OnFilterScriptInit()
{
    print("[BLESK] Perfect server UI loaded");
    gBleskDB = db_open("blesk_names.db");
    if(gBleskDB != DB:0)
    {
        new DBResult:res = db_query(gBleskDB,
            "CREATE TABLE IF NOT EXISTS blesk_names (account_name TEXT PRIMARY KEY, display_name TEXT NOT NULL)");
        if(res) db_free_result(res);
    }

    for(new i = 0; i < MAX_PLAYERS; i++)
    {
        gNameLabel[i] = Text3D:INVALID_3DTEXT_ID;
        gMenuVisible[i] = false;
        gMenuShownThisSession[i] = false;
        for(new t = 0; t < BTD_TOTAL; t++) gBleskTD[i][t] = PlayerText:INVALID_TEXT_DRAW;
    }
    return 1;
}

public OnFilterScriptExit()
{
    for(new i = 0; i < MAX_PLAYERS; i++)
    {
        if(IsPlayerConnected(i))
        {
            Blesk_SaveName(i);
            Blesk_DestroyTD(i);
            if(gNameLabel[i] != Text3D:INVALID_3DTEXT_ID) Delete3DTextLabel(gNameLabel[i]);
        }
    }
    if(gBleskDB != DB:0) db_close(gBleskDB);
    return 1;
}

public OnPlayerConnect(playerid)
{
    gMenuVisible[playerid] = false;
    gMenuShownThisSession[playerid] = false;
    gNameLabel[playerid] = Text3D:INVALID_3DTEXT_ID;
    for(new t = 0; t < BTD_TOTAL; t++) gBleskTD[playerid][t] = PlayerText:INVALID_TEXT_DRAW;
    Blesk_LoadName(playerid);
    if(gHasDisplayName[playerid]) Blesk_RefreshNameLabel(playerid);
    return 1;
}

public OnPlayerDisconnect(playerid, reason)
{
    #pragma unused reason
    Blesk_SaveName(playerid);
    Blesk_DestroyTD(playerid);
    if(gNameLabel[playerid] != Text3D:INVALID_3DTEXT_ID) Delete3DTextLabel(gNameLabel[playerid]);
    gNameLabel[playerid] = Text3D:INVALID_3DTEXT_ID;
    gMenuVisible[playerid] = false;
    gMenuShownThisSession[playerid] = false;
    return 1;
}

public OnPlayerSpawn(playerid)
{
    if(gHasDisplayName[playerid]) Blesk_RefreshNameLabel(playerid);
    if(!gMenuShownThisSession[playerid])
    {
        gMenuShownThisSession[playerid] = true;
        SetTimerEx("Blesk_ShowMenuDelayed", 900, false, "i", playerid);
    }
    return 1;
}

public Blesk_ShowMenuDelayed(playerid)
{
    if(IsPlayerConnected(playerid)) Blesk_ShowMenu(playerid);
    return 1;
}

public OnPlayerStreamIn(playerid, forplayerid)
{
    if(gHasDisplayName[playerid]) ShowPlayerNameTagForPlayer(forplayerid, playerid, false);
    return 1;
}

public OnPlayerClickPlayerTextDraw(playerid, PlayerText:playertextid)
{
    if(!gMenuVisible[playerid]) return 0;

    if(playertextid == gBleskTD[playerid][BTD_NAME_BOX])
    {
        PlayerPlaySound(playerid, 1083, 0.0, 0.0, 0.0);
        Blesk_OpenNameDialog(playerid);
        return 1;
    }
    if(playertextid == gBleskTD[playerid][BTD_PLAY_BOX])
    {
        PlayerPlaySound(playerid, 1057, 0.0, 0.0, 0.0);
        Blesk_HideMenu(playerid);
        return 1;
    }
    if(playertextid == gBleskTD[playerid][BTD_INFO_BOX])
    {
        CancelSelectTextDraw(playerid);
        ShowPlayerDialog(playerid, BLESK_DIALOG_INFO, DIALOG_STYLE_MSGBOX,
            "{E53935}BLESK RUSSIA",
            "{FFFFFF}СЕРВЕРНОЕ МЕНЮ BLESK RUSSIA.\n\n{B8BDC8}• /bleskmenu — ОТКРЫТЬ МЕНЮ\n• /nick — СМЕНИТЬ ИГРОВОЕ ИМЯ\n• ПРОБЕЛЫ И РУССКИЙ ЯЗЫК РАЗРЕШЕНЫ\n• НОВЫЙ APK НЕ НУЖЕН",
            "НАЗАД", "");
        return 1;
    }
    if(playertextid == gBleskTD[playerid][BTD_SETTINGS_BOX])
    {
        CancelSelectTextDraw(playerid);
        ShowPlayerDialog(playerid, BLESK_DIALOG_SETTINGS, DIALOG_STYLE_LIST,
            "{E53935}BLESK RUSSIA {FFFFFF}— НАСТРОЙКИ",
            "ИЗМЕНИТЬ ИГРОВОЕ ИМЯ\nВЕРНУТЬСЯ В ИГРУ",
            "ВЫБРАТЬ", "НАЗАД");
        return 1;
    }
    return 0;
}

public OnPlayerClickTextDraw(playerid, Text:clickedid)
{
    if(clickedid == Text:INVALID_TEXT_DRAW && gMenuVisible[playerid])
    {
        SelectTextDraw(playerid, BLESK_COLOR_ACCENT);
        return 1;
    }
    return 0;
}

public OnDialogResponse(playerid, dialogid, response, listitem, inputtext[])
{
    if(dialogid == BLESK_DIALOG_NAME)
    {
        if(!response)
        {
            if(gMenuVisible[playerid]) SelectTextDraw(playerid, BLESK_COLOR_ACCENT);
            return 1;
        }

        new newName[BLESK_MAX_DISPLAY_NAME + 1];
        format(newName, sizeof newName, "%s", inputtext);
        Blesk_StrReplaceControlChars(newName);
        Blesk_TrimSpaces(newName);

        new len = strlen(newName);
        if(len < 1 || len > BLESK_MAX_DISPLAY_NAME)
        {
            ShowPlayerDialog(playerid, BLESK_DIALOG_NAME, DIALOG_STYLE_INPUT,
                "{E53935}BLESK RUSSIA {FFFFFF}— ИГРОВОЕ ИМЯ",
                "{FF6B6B}ИМЯ ДОЛЖНО БЫТЬ ОТ 1 ДО 32 СИМВОЛОВ.\n\n{FFFFFF}ПРОБЕЛЫ, РУССКИЙ ЯЗЫК И СИМВОЛЫ РАЗРЕШЕНЫ.",
                "СОХРАНИТЬ", "НАЗАД");
            return 1;
        }

        format(gDisplayName[playerid], BLESK_MAX_DISPLAY_NAME + 1, "%s", newName);
        gHasDisplayName[playerid] = true;
        Blesk_SaveName(playerid);
        Blesk_RefreshNameLabel(playerid);
        if(gBleskTD[playerid][BTD_NAME_TEXT] != PlayerText:INVALID_TEXT_DRAW)
            PlayerTextDrawSetString(playerid, gBleskTD[playerid][BTD_NAME_TEXT], gDisplayName[playerid]);

        PlayerPlaySound(playerid, 1054, 0.0, 0.0, 0.0);
        if(gMenuVisible[playerid]) SelectTextDraw(playerid, BLESK_COLOR_ACCENT);
        return 1;
    }

    if(dialogid == BLESK_DIALOG_INFO)
    {
        if(gMenuVisible[playerid]) SelectTextDraw(playerid, BLESK_COLOR_ACCENT);
        return 1;
    }

    if(dialogid == BLESK_DIALOG_SETTINGS)
    {
        if(response)
        {
            if(listitem == 0) return Blesk_OpenNameDialog(playerid);
            if(listitem == 1)
            {
                Blesk_HideMenu(playerid);
                return 1;
            }
        }
        if(gMenuVisible[playerid]) SelectTextDraw(playerid, BLESK_COLOR_ACCENT);
        return 1;
    }
    return 0;
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if(!strcmp(cmdtext, "/bleskmenu", true) || !strcmp(cmdtext, "/menu", true))
    {
        Blesk_ShowMenu(playerid);
        return 1;
    }
    if(!strcmp(cmdtext, "/nick", true) || !strcmp(cmdtext, "/myname", true))
    {
        Blesk_OpenNameDialog(playerid);
        return 1;
    }
    return 0;
}
