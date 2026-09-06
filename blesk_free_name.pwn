#include <a_samp>

#define DIALOG_BLESK_NAME 28910
#define DIALOG_BLESK_INFO 28911
#define MAX_DISPLAY_NAME 32
#define COLOR_RED 0xE53935FF
#define COLOR_WHITE 0xFFFFFFFF

new DB:gDB;
new gDisplayName[MAX_PLAYERS][MAX_DISPLAY_NAME + 1];
new bool:gHasDisplayName[MAX_PLAYERS];
new bool:gMenuVisible[MAX_PLAYERS];
new bool:gMenuShown[MAX_PLAYERS];
new Text3D:gNameLabel[MAX_PLAYERS];
new PlayerText:gTD[MAX_PLAYERS][9];

forward Blesk_ShowMenuDelayed(playerid);

stock EscapeSQL(const input[], output[], size)
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

stock SaveDisplayName(playerid)
{
    if(gDB == DB:0 || !gHasDisplayName[playerid]) return 0;
    new tech[MAX_PLAYER_NAME + 1], etech[(MAX_PLAYER_NAME + 1) * 2];
    new ename[(MAX_DISPLAY_NAME + 1) * 2], q[220];
    GetPlayerName(playerid, tech, sizeof tech);
    EscapeSQL(tech, etech, sizeof etech);
    EscapeSQL(gDisplayName[playerid], ename, sizeof ename);
    format(q, sizeof q, "INSERT OR REPLACE INTO names (account_name,display_name) VALUES ('%s','%s')", etech, ename);
    new DBResult:r = db_query(gDB, q);
    if(r) db_free_result(r);
    return 1;
}

stock LoadDisplayName(playerid)
{
    gHasDisplayName[playerid] = false;
    gDisplayName[playerid][0] = EOS;
    if(gDB == DB:0) return 0;
    new tech[MAX_PLAYER_NAME + 1], etech[(MAX_PLAYER_NAME + 1) * 2], q[150];
    GetPlayerName(playerid, tech, sizeof tech);
    EscapeSQL(tech, etech, sizeof etech);
    format(q, sizeof q, "SELECT display_name FROM names WHERE account_name='%s' LIMIT 1", etech);
    new DBResult:r = db_query(gDB, q);
    if(r)
    {
        if(db_num_rows(r) > 0)
        {
            db_get_field_assoc(r, "display_name", gDisplayName[playerid], MAX_DISPLAY_NAME + 1);
            if(strlen(gDisplayName[playerid])) gHasDisplayName[playerid] = true;
        }
        db_free_result(r);
    }
    return 1;
}

stock BleskDestroyLabel(playerid)
{
    if(gNameLabel[playerid] != Text3D:INVALID_3DTEXT_ID)
    {
        Delete3DTextLabel(gNameLabel[playerid]);
        gNameLabel[playerid] = Text3D:INVALID_3DTEXT_ID;
    }
    return 1;
}

stock ApplyLabel(playerid)
{
    BleskDestroyLabel(playerid);
    if(!gHasDisplayName[playerid]) return 1;
    gNameLabel[playerid] = Create3DTextLabel(gDisplayName[playerid], COLOR_WHITE, 0.0, 0.0, 0.0, 20.0, 0, 1);
    Attach3DTextLabelToPlayer(gNameLabel[playerid], playerid, 0.0, 0.0, 0.35);
    for(new i = 0; i < MAX_PLAYERS; i++)
        if(IsPlayerConnected(i)) ShowPlayerNameTagForPlayer(i, playerid, false);
    return 1;
}

stock BleskDestroyMenu(playerid)
{
    for(new i = 0; i < 9; i++)
    {
        if(gTD[playerid][i] != PlayerText:INVALID_TEXT_DRAW)
        {
            PlayerTextDrawDestroy(playerid, gTD[playerid][i]);
            gTD[playerid][i] = PlayerText:INVALID_TEXT_DRAW;
        }
    }
    return 1;
}

stock MakeTD(playerid, idx, Float:x, Float:y, const text[], Float:letterX, Float:letterY, color)
{
    gTD[playerid][idx] = CreatePlayerTextDraw(playerid, x, y, text);
    PlayerTextDrawFont(playerid, gTD[playerid][idx], 1);
    PlayerTextDrawLetterSize(playerid, gTD[playerid][idx], letterX, letterY);
    PlayerTextDrawColor(playerid, gTD[playerid][idx], color);
    PlayerTextDrawSetProportional(playerid, gTD[playerid][idx], 1);
    return 1;
}

stock MakeButton(playerid, idx, Float:x, Float:y, const text[], boxcolor)
{
    MakeTD(playerid, idx, x, y, text, 0.28, 1.35, COLOR_WHITE);
    PlayerTextDrawUseBox(playerid, gTD[playerid][idx], 1);
    PlayerTextDrawBoxColor(playerid, gTD[playerid][idx], boxcolor);
    PlayerTextDrawTextSize(playerid, gTD[playerid][idx], x + 150.0, 0.0);
    PlayerTextDrawSetSelectable(playerid, gTD[playerid][idx], true);
    return 1;
}

stock ShowBleskMenu(playerid)
{
    if(!IsPlayerConnected(playerid) || gMenuVisible[playerid]) return 0;
    BleskDestroyMenu(playerid);

    MakeTD(playerid, 0, 420.0, 72.0, "BLESK", 0.52, 2.1, COLOR_WHITE);
    MakeTD(playerid, 1, 487.0, 79.0, "RUSSIA", 0.24, 1.25, COLOR_RED);
    MakeTD(playerid, 2, 420.0, 112.0, "SERVER MENU", 0.18, 0.9, 0xB9C0CBFF);
    MakeTD(playerid, 3, 420.0, 150.0, "DISPLAY NAME", 0.18, 0.9, 0xB9C0CBFF);
    MakeButton(playerid, 4, 420.0, 170.0, "CHANGE NAME", 0x222833DD);
    MakeButton(playerid, 5, 420.0, 225.0, "PLAY", COLOR_RED);
    MakeButton(playerid, 6, 420.0, 280.0, "INFO", 0x222833DD);
    MakeTD(playerid, 7, 420.0, 338.0, "BLESK RUSSIA  |  SERVER #1", 0.16, 0.8, 0x8E97A6FF);
    MakeTD(playerid, 8, 420.0, 360.0, "/bleskmenu  /nick", 0.16, 0.8, 0x8E97A6FF);

    for(new i = 0; i < 9; i++) PlayerTextDrawShow(playerid, gTD[playerid][i]);
    TogglePlayerControllable(playerid, false);
    SelectTextDraw(playerid, COLOR_RED);
    gMenuVisible[playerid] = true;
    return 1;
}

stock HideBleskMenu(playerid)
{
    if(!gMenuVisible[playerid]) return 1;
    CancelSelectTextDraw(playerid);
    for(new i = 0; i < 9; i++)
        if(gTD[playerid][i] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, gTD[playerid][i]);
    TogglePlayerControllable(playerid, true);
    gMenuVisible[playerid] = false;
    return 1;
}

stock OpenNameDialog(playerid)
{
    CancelSelectTextDraw(playerid);
    ShowPlayerDialog(playerid, DIALOG_BLESK_NAME, DIALOG_STYLE_INPUT,
        "BLESK RUSSIA - DISPLAY NAME",
        "Enter any display name. Spaces and non-English characters are accepted by this server display-name system.\nMaximum: 32 characters.",
        "SAVE", "BACK");
    return 1;
}

public OnFilterScriptInit()
{
    print("[BLESK SAFE UI] loaded");
    gDB = db_open("blesk_names.db");
    if(gDB != DB:0)
    {
        new DBResult:r = db_query(gDB, "CREATE TABLE IF NOT EXISTS names (account_name TEXT PRIMARY KEY, display_name TEXT NOT NULL)");
        if(r) db_free_result(r);
    }
    for(new p = 0; p < MAX_PLAYERS; p++)
    {
        gNameLabel[p] = Text3D:INVALID_3DTEXT_ID;
        gMenuVisible[p] = false;
        gMenuShown[p] = false;
        for(new i = 0; i < 9; i++) gTD[p][i] = PlayerText:INVALID_TEXT_DRAW;
    }
    return 1;
}

public OnFilterScriptExit()
{
    for(new p = 0; p < MAX_PLAYERS; p++)
    {
        if(IsPlayerConnected(p)) SaveDisplayName(p);
        BleskDestroyMenu(p);
        BleskDestroyLabel(p);
    }
    if(gDB != DB:0) db_close(gDB);
    return 1;
}

public OnPlayerConnect(playerid)
{
    gMenuVisible[playerid] = false;
    gMenuShown[playerid] = false;
    gNameLabel[playerid] = Text3D:INVALID_3DTEXT_ID;
    for(new i = 0; i < 9; i++) gTD[playerid][i] = PlayerText:INVALID_TEXT_DRAW;
    LoadDisplayName(playerid);
    return 1;
}

public OnPlayerDisconnect(playerid, reason)
{
    #pragma unused reason
    SaveDisplayName(playerid);
    BleskDestroyMenu(playerid);
    BleskDestroyLabel(playerid);
    gMenuVisible[playerid] = false;
    gMenuShown[playerid] = false;
    return 1;
}

public OnPlayerSpawn(playerid)
{
    if(gHasDisplayName[playerid]) ApplyLabel(playerid);
    if(!gMenuShown[playerid])
    {
        gMenuShown[playerid] = true;
        SetTimerEx("Blesk_ShowMenuDelayed", 2200, false, "i", playerid);
    }
    return 1;
}

public Blesk_ShowMenuDelayed(playerid)
{
    if(IsPlayerConnected(playerid)) ShowBleskMenu(playerid);
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
    if(playertextid == gTD[playerid][4])
    {
        OpenNameDialog(playerid);
        return 1;
    }
    if(playertextid == gTD[playerid][5])
    {
        HideBleskMenu(playerid);
        return 1;
    }
    if(playertextid == gTD[playerid][6])
    {
        CancelSelectTextDraw(playerid);
        ShowPlayerDialog(playerid, DIALOG_BLESK_INFO, DIALOG_STYLE_MSGBOX,
            "BLESK RUSSIA",
            "Server-side compatibility menu.\n/nick - change display name\n/bleskmenu - open this menu\nNo APK update is required.",
            "BACK", "");
        return 1;
    }
    return 0;
}

public OnPlayerClickTextDraw(playerid, Text:clickedid)
{
    if(clickedid == Text:INVALID_TEXT_DRAW && gMenuVisible[playerid])
    {
        SelectTextDraw(playerid, COLOR_RED);
        return 1;
    }
    return 0;
}

public OnDialogResponse(playerid, dialogid, response, listitem, inputtext[])
{
    #pragma unused listitem
    if(dialogid == DIALOG_BLESK_NAME)
    {
        if(!response)
        {
            if(gMenuVisible[playerid]) SelectTextDraw(playerid, COLOR_RED);
            return 1;
        }

        new n[MAX_DISPLAY_NAME + 1];
        format(n, sizeof n, "%s", inputtext);
        new len = strlen(n);
        if(len < 1 || len > MAX_DISPLAY_NAME)
        {
            ShowPlayerDialog(playerid, DIALOG_BLESK_NAME, DIALOG_STYLE_INPUT,
                "BLESK RUSSIA - DISPLAY NAME",
                "Name must contain 1 to 32 characters.",
                "SAVE", "BACK");
            return 1;
        }

        format(gDisplayName[playerid], MAX_DISPLAY_NAME + 1, "%s", n);
        gHasDisplayName[playerid] = true;
        SaveDisplayName(playerid);
        ApplyLabel(playerid);
        SendClientMessage(playerid, COLOR_RED, "BLESK RUSSIA | Display name saved.");
        if(gMenuVisible[playerid]) SelectTextDraw(playerid, COLOR_RED);
        return 1;
    }

    if(dialogid == DIALOG_BLESK_INFO)
    {
        if(gMenuVisible[playerid]) SelectTextDraw(playerid, COLOR_RED);
        return 1;
    }
    return 0;
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if(!strcmp(cmdtext, "/bleskmenu", true) || !strcmp(cmdtext, "/menu", true))
    {
        ShowBleskMenu(playerid);
        return 1;
    }
    if(!strcmp(cmdtext, "/nick", true) || !strcmp(cmdtext, "/myname", true))
    {
        OpenNameDialog(playerid);
        return 1;
    }
    return 0;
}
