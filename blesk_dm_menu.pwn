#define FILTERSCRIPT
#include <a_samp>
#include <Pawn.RakNet>

#define PLAYER_MENU_DIALOG   (8)
#define RPC_SHOW_DIALOG      (61)
#define RPC_DIALOG_RESPONSE  (62)

#define DM_DIALOG_CONTROL    (30120)
#define DM_DIALOG_CONFIRM    (30121)
#define DM_WORLD             (7777)
#define MAX_DM_OBJECTS       (24)

#define DM_COLOR_RED         (0xE53935FF)
#define DM_COLOR_WHITE       (0xFFFFFFFF)
#define DM_COLOR_GREEN       (0x45D483FF)
#define DM_COLOR_GRAY        (0xA9B0BCFF)

new bool:gInDM[MAX_PLAYERS];
new Float:gReturnX[MAX_PLAYERS], Float:gReturnY[MAX_PLAYERS], Float:gReturnZ[MAX_PLAYERS], Float:gReturnA[MAX_PLAYERS];
new gReturnInterior[MAX_PLAYERS], gReturnWorld[MAX_PLAYERS];
new Float:gReturnHealth[MAX_PLAYERS], Float:gReturnArmour[MAX_PLAYERS];
new gSavedWeapon[MAX_PLAYERS][13], gSavedAmmo[MAX_PLAYERS][13];
new gDMKills[MAX_PLAYERS], gDMDeaths[MAX_PLAYERS];
new gDMObject[MAX_PLAYERS][MAX_DM_OBJECTS];
new gDMObjectCount[MAX_PLAYERS];

forward DM_Respawn(playerid);
forward DM_EnterDelayed(playerid);

new const Float:gDMSpawns[][4] =
{
    {392.8, 2488.0, 16.8,  45.0},
    {420.1, 2489.6, 16.8, 135.0},
    {433.2, 2510.4, 16.8, 180.0},
    {421.0, 2532.2, 16.8, 225.0},
    {393.6, 2531.8, 16.8, 315.0},
    {379.7, 2510.0, 16.8,   0.0},
    {402.5, 2500.8, 16.8,  90.0},
    {411.0, 2521.0, 16.8, 270.0}
};

stock DM_ResetPlayerData(playerid)
{
    gInDM[playerid] = false;
    gDMKills[playerid] = 0;
    gDMDeaths[playerid] = 0;
    gDMObjectCount[playerid] = 0;
    for(new i = 0; i < MAX_DM_OBJECTS; i++) gDMObject[playerid][i] = INVALID_OBJECT_ID;
    return 1;
}

stock DM_DestroyMap(playerid)
{
    for(new i = 0; i < gDMObjectCount[playerid]; i++)
    {
        if(gDMObject[playerid][i] != INVALID_OBJECT_ID)
        {
            DestroyPlayerObject(playerid, gDMObject[playerid][i]);
            gDMObject[playerid][i] = INVALID_OBJECT_ID;
        }
    }
    gDMObjectCount[playerid] = 0;
    return 1;
}

stock DM_AddObject(playerid, modelid, Float:x, Float:y, Float:z, Float:rx, Float:ry, Float:rz)
{
    if(gDMObjectCount[playerid] >= MAX_DM_OBJECTS) return 0;
    new objectid = CreatePlayerObject(playerid, modelid, x, y, z, rx, ry, rz, 180.0);
    if(objectid == INVALID_OBJECT_ID) return 0;
    gDMObject[playerid][gDMObjectCount[playerid]++] = objectid;
    return 1;
}

stock DM_CreateMap(playerid)
{
    DM_DestroyMap(playerid);
    DM_AddObject(playerid, 2934, 398.0, 2498.0, 18.0, 0.0, 0.0,   0.0);
    DM_AddObject(playerid, 2935, 416.0, 2498.0, 18.0, 0.0, 0.0,  90.0);
    DM_AddObject(playerid, 2934, 398.0, 2522.0, 18.0, 0.0, 0.0,  90.0);
    DM_AddObject(playerid, 2935, 416.0, 2522.0, 18.0, 0.0, 0.0,   0.0);
    DM_AddObject(playerid, 3578, 407.0, 2490.0, 17.2, 0.0, 0.0,   0.0);
    DM_AddObject(playerid, 3578, 407.0, 2530.0, 17.2, 0.0, 0.0,   0.0);
    DM_AddObject(playerid, 3578, 382.0, 2510.0, 17.2, 0.0, 0.0,  90.0);
    DM_AddObject(playerid, 3578, 432.0, 2510.0, 17.2, 0.0, 0.0,  90.0);
    DM_AddObject(playerid, 3578, 400.5, 2509.5, 17.2, 0.0, 0.0,  45.0);
    DM_AddObject(playerid, 3578, 413.5, 2510.5, 17.2, 0.0, 0.0, 315.0);
    DM_AddObject(playerid, 3578, 407.0, 2503.0, 17.2, 0.0, 0.0,  90.0);
    DM_AddObject(playerid, 3578, 407.0, 2517.0, 17.2, 0.0, 0.0,  90.0);
    DM_AddObject(playerid, 987, 376.0, 2482.0, 16.6, 0.0, 0.0, 0.0);
    DM_AddObject(playerid, 987, 388.0, 2482.0, 16.6, 0.0, 0.0, 0.0);
    DM_AddObject(playerid, 987, 400.0, 2482.0, 16.6, 0.0, 0.0, 0.0);
    DM_AddObject(playerid, 987, 412.0, 2482.0, 16.6, 0.0, 0.0, 0.0);
    DM_AddObject(playerid, 987, 424.0, 2482.0, 16.6, 0.0, 0.0, 0.0);
    DM_AddObject(playerid, 987, 376.0, 2538.0, 16.6, 0.0, 0.0, 0.0);
    DM_AddObject(playerid, 987, 388.0, 2538.0, 16.6, 0.0, 0.0, 0.0);
    DM_AddObject(playerid, 987, 400.0, 2538.0, 16.6, 0.0, 0.0, 0.0);
    DM_AddObject(playerid, 987, 412.0, 2538.0, 16.6, 0.0, 0.0, 0.0);
    DM_AddObject(playerid, 987, 424.0, 2538.0, 16.6, 0.0, 0.0, 0.0);
    return 1;
}

stock DM_SavePlayerState(playerid)
{
    GetPlayerPos(playerid, gReturnX[playerid], gReturnY[playerid], gReturnZ[playerid]);
    GetPlayerFacingAngle(playerid, gReturnA[playerid]);
    gReturnInterior[playerid] = GetPlayerInterior(playerid);
    gReturnWorld[playerid] = GetPlayerVirtualWorld(playerid);
    GetPlayerHealth(playerid, gReturnHealth[playerid]);
    GetPlayerArmour(playerid, gReturnArmour[playerid]);
    for(new slot = 0; slot < 13; slot++)
        GetPlayerWeaponData(playerid, slot, gSavedWeapon[playerid][slot], gSavedAmmo[playerid][slot]);
    return 1;
}

stock DM_GiveLoadout(playerid)
{
    ResetPlayerWeapons(playerid);
    GivePlayerWeapon(playerid, 24, 120);
    GivePlayerWeapon(playerid, 25, 100);
    GivePlayerWeapon(playerid, 31, 700);
    GivePlayerWeapon(playerid, 4, 1);
    SetPlayerHealth(playerid, 100.0);
    SetPlayerArmour(playerid, 100.0);
    return 1;
}

stock DM_TeleportToSpawn(playerid)
{
    new idx = random(sizeof(gDMSpawns));
    SetPlayerInterior(playerid, 0);
    SetPlayerVirtualWorld(playerid, DM_WORLD);
    SetPlayerPos(playerid, gDMSpawns[idx][0], gDMSpawns[idx][1], gDMSpawns[idx][2]);
    SetPlayerFacingAngle(playerid, gDMSpawns[idx][3]);
    SetCameraBehindPlayer(playerid);
    DM_GiveLoadout(playerid);
    return 1;
}

stock DM_Enter(playerid)
{
    if(gInDM[playerid]) return DM_TeleportToSpawn(playerid);
    DM_SavePlayerState(playerid);
    gInDM[playerid] = true;
    if(IsPlayerInAnyVehicle(playerid)) RemovePlayerFromVehicle(playerid);
    DM_CreateMap(playerid);
    DM_TeleportToSpawn(playerid);
    SendClientMessage(playerid, DM_COLOR_RED, "BLESK RUSSIA | DM ZONE");
    SendClientMessage(playerid, DM_COLOR_WHITE, "Deagle / Shotgun / M4 / Knife. Respawn remains inside DM.");
    SendClientMessage(playerid, DM_COLOR_GRAY, "Open Player Menu -> DM ZONE again for stats or exit.");
    return 1;
}

stock DM_Exit(playerid)
{
    if(!gInDM[playerid]) return 1;
    gInDM[playerid] = false;
    DM_DestroyMap(playerid);
    ResetPlayerWeapons(playerid);
    for(new slot = 0; slot < 13; slot++)
    {
        if(gSavedWeapon[playerid][slot] > 0 && gSavedAmmo[playerid][slot] > 0)
            GivePlayerWeapon(playerid, gSavedWeapon[playerid][slot], gSavedAmmo[playerid][slot]);
    }
    SetPlayerInterior(playerid, gReturnInterior[playerid]);
    SetPlayerVirtualWorld(playerid, gReturnWorld[playerid]);
    SetPlayerPos(playerid, gReturnX[playerid], gReturnY[playerid], gReturnZ[playerid]);
    SetPlayerFacingAngle(playerid, gReturnA[playerid]);
    SetPlayerHealth(playerid, gReturnHealth[playerid]);
    SetPlayerArmour(playerid, gReturnArmour[playerid]);
    SetCameraBehindPlayer(playerid);
    SendClientMessage(playerid, DM_COLOR_GREEN, "BLESK DM: returned to the main world.");
    return 1;
}

stock DM_ShowControl(playerid)
{
    ShowPlayerDialog(playerid, DM_DIALOG_CONTROL, DIALOG_STYLE_LIST,
        "BLESK RUSSIA | DM ZONE",
        "RETURN TO ARENA\nDM STATS\nEXIT DM ZONE",
        "SELECT", "CLOSE");
    return 1;
}

ORPC:61(playerid, BitStream:bs)
{
    new dialogid, style;
    new title[96], button1[40], button2[40], body[4096];

    BS_ReadUint16(bs, dialogid);
    BS_ReadUint8(bs, style);
    BS_ReadString8(bs, title);
    BS_ReadString8(bs, button1);
    BS_ReadString8(bs, button2);
    BS_ReadCompressedString(bs, body, sizeof(body));

    if(dialogid != PLAYER_MENU_DIALOG || style != DIALOG_STYLE_LIST) return 1;

    if(strfind(body, "13. DM ZONE", true) == -1)
        strcat(body, "\n{FF6A00}13. DM ZONE", sizeof(body));

    BS_Reset(bs);
    BS_WriteUint16(bs, dialogid);
    BS_WriteUint8(bs, style);
    BS_WriteString8(bs, title);
    BS_WriteString8(bs, button1);
    BS_WriteString8(bs, button2);
    BS_WriteCompressedString(bs, body);
    return 1;
}

IRPC:62(playerid, BitStream:bs)
{
    new dialogid, button, listitem;
    new input[256];

    BS_ReadUint16(bs, dialogid);
    BS_ReadUint8(bs, button);
    BS_ReadUint16(bs, listitem);
    BS_ReadString8(bs, input);

    if(dialogid == PLAYER_MENU_DIALOG && button == 1 && listitem == 12)
    {
        if(gInDM[playerid])
            DM_ShowControl(playerid);
        else
            ShowPlayerDialog(playerid, DM_DIALOG_CONFIRM, DIALOG_STYLE_MSGBOX,
                "BLESK RUSSIA | DM ZONE",
                "Enter the DM arena?\n\nSeparate world, arena, weapons and respawn will be enabled.",
                "ENTER", "BACK");
        return 0;
    }
    return 1;
}

public OnFilterScriptInit()
{
    print("[BLESK DM] native Player Menu integration loaded");
    for(new i = 0; i < MAX_PLAYERS; i++) DM_ResetPlayerData(i);
    return 1;
}

public OnFilterScriptExit()
{
    for(new i = 0; i < MAX_PLAYERS; i++)
    {
        if(IsPlayerConnected(i) && gInDM[i]) DM_Exit(i);
        else DM_DestroyMap(i);
    }
    return 1;
}

public OnPlayerConnect(playerid)
{
    DM_ResetPlayerData(playerid);
    return 1;
}

public OnPlayerDisconnect(playerid, reason)
{
    #pragma unused reason
    DM_DestroyMap(playerid);
    DM_ResetPlayerData(playerid);
    return 1;
}

public OnPlayerSpawn(playerid)
{
    if(gInDM[playerid]) SetTimerEx("DM_Respawn", 500, false, "i", playerid);
    return 1;
}

public DM_Respawn(playerid)
{
    if(IsPlayerConnected(playerid) && gInDM[playerid]) DM_TeleportToSpawn(playerid);
    return 1;
}

public DM_EnterDelayed(playerid)
{
    if(IsPlayerConnected(playerid)) DM_Enter(playerid);
    return 1;
}

public OnPlayerDeath(playerid, killerid, reason)
{
    #pragma unused reason
    if(gInDM[playerid])
    {
        gDMDeaths[playerid]++;
        if(killerid != INVALID_PLAYER_ID && killerid != playerid && gInDM[killerid])
            gDMKills[killerid]++;
    }
    return 1;
}

public OnDialogResponse(playerid, dialogid, response, listitem, inputtext[])
{
    #pragma unused inputtext
    if(dialogid == DM_DIALOG_CONFIRM)
    {
        if(response) SetTimerEx("DM_EnterDelayed", 100, false, "i", playerid);
        return 1;
    }
    if(dialogid == DM_DIALOG_CONTROL)
    {
        if(!response) return 1;
        switch(listitem)
        {
            case 0: DM_TeleportToSpawn(playerid);
            case 1:
            {
                new msg[96];
                format(msg, sizeof(msg), "BLESK DM | Kills: %d | Deaths: %d", gDMKills[playerid], gDMDeaths[playerid]);
                SendClientMessage(playerid, DM_COLOR_WHITE, msg);
            }
            case 2: DM_Exit(playerid);
        }
        return 1;
    }
    return 0;
}
