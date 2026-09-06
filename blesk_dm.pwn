#include <a_samp>

#define DM_DIALOG_MAIN      (30100)
#define DM_DIALOG_CONFIRM   (30101)
#define DM_WORLD            (7777)
#define MAX_DM_OBJECTS      (24)
#define DM_COLOR_RED        (0xE53935FF)
#define DM_COLOR_WHITE      (0xFFFFFFFF)
#define DM_COLOR_GREEN      (0x45D483FF)
#define DM_COLOR_GRAY       (0xA9B0BCFF)

new bool:gInDM[MAX_PLAYERS];
new Float:gReturnX[MAX_PLAYERS], Float:gReturnY[MAX_PLAYERS], Float:gReturnZ[MAX_PLAYERS], Float:gReturnA[MAX_PLAYERS];
new gReturnInterior[MAX_PLAYERS], gReturnWorld[MAX_PLAYERS];
new Float:gReturnHealth[MAX_PLAYERS], Float:gReturnArmour[MAX_PLAYERS];
new gSavedWeapon[MAX_PLAYERS][13], gSavedAmmo[MAX_PLAYERS][13];
new gDMKills[MAX_PLAYERS], gDMDeaths[MAX_PLAYERS];
new gDMObject[MAX_PLAYERS][MAX_DM_OBJECTS];
new gDMObjectCount[MAX_PLAYERS];

forward DM_Respawn(playerid);

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

stock DM_AddObject(playerid, modelid, Float:x, Float:y, Float:z, Float:rx, Float:ry, Float:rz)
{
    if(gDMObjectCount[playerid] >= MAX_DM_OBJECTS) return 0;
    new obj = CreatePlayerObject(playerid, modelid, x, y, z, rx, ry, rz, 180.0);
    if(obj != INVALID_OBJECT_ID)
    {
        gDMObject[playerid][gDMObjectCount[playerid]++] = obj;
        return 1;
    }
    return 0;
}

stock DM_CreateMap(playerid)
{
    DM_DestroyMap(playerid);

    // Container / barrier arena on the abandoned airstrip.
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

    // Outer fence pieces.
    DM_AddObject(playerid, 987, 376.0, 2482.0, 16.6, 0.0, 0.0,   0.0);
    DM_AddObject(playerid, 987, 388.0, 2482.0, 16.6, 0.0, 0.0,   0.0);
    DM_AddObject(playerid, 987, 400.0, 2482.0, 16.6, 0.0, 0.0,   0.0);
    DM_AddObject(playerid, 987, 412.0, 2482.0, 16.6, 0.0, 0.0,   0.0);
    DM_AddObject(playerid, 987, 424.0, 2482.0, 16.6, 0.0, 0.0,   0.0);

    DM_AddObject(playerid, 987, 376.0, 2538.0, 16.6, 0.0, 0.0,   0.0);
    DM_AddObject(playerid, 987, 388.0, 2538.0, 16.6, 0.0, 0.0,   0.0);
    DM_AddObject(playerid, 987, 400.0, 2538.0, 16.6, 0.0, 0.0,   0.0);
    DM_AddObject(playerid, 987, 412.0, 2538.0, 16.6, 0.0, 0.0,   0.0);
    DM_AddObject(playerid, 987, 424.0, 2538.0, 16.6, 0.0, 0.0,   0.0);
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

stock DM_SavePlayerState(playerid)
{
    GetPlayerPos(playerid, gReturnX[playerid], gReturnY[playerid], gReturnZ[playerid]);
    GetPlayerFacingAngle(playerid, gReturnA[playerid]);
    gReturnInterior[playerid] = GetPlayerInterior(playerid);
    gReturnWorld[playerid] = GetPlayerVirtualWorld(playerid);
    GetPlayerHealth(playerid, gReturnHealth[playerid]);
    GetPlayerArmour(playerid, gReturnArmour[playerid]);

    for(new slot = 0; slot < 13; slot++)
    {
        GetPlayerWeaponData(playerid, slot, gSavedWeapon[playerid][slot], gSavedAmmo[playerid][slot]);
    }
    return 1;
}

stock DM_GiveLoadout(playerid)
{
    ResetPlayerWeapons(playerid);
    GivePlayerWeapon(playerid, 24, 90);   // Deagle
    GivePlayerWeapon(playerid, 25, 80);   // Shotgun
    GivePlayerWeapon(playerid, 31, 600);  // M4
    GivePlayerWeapon(playerid, 4, 1);     // Knife
    SetPlayerHealth(playerid, 100.0);
    SetPlayerArmour(playerid, 100.0);
    return 1;
}

stock DM_TeleportToRandomSpawn(playerid)
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
    if(gInDM[playerid])
    {
        SendClientMessage(playerid, DM_COLOR_GRAY, "BLESK DM: You are already in the DM zone. Use /dmexit to leave.");
        return 1;
    }

    DM_SavePlayerState(playerid);
    gInDM[playerid] = true;

    if(IsPlayerInAnyVehicle(playerid)) RemovePlayerFromVehicle(playerid);
    DM_CreateMap(playerid);
    DM_TeleportToRandomSpawn(playerid);

    SendClientMessage(playerid, DM_COLOR_RED, "BLESK RUSSIA | DM ZONE");
    SendClientMessage(playerid, DM_COLOR_WHITE, "Fight other players. You respawn back in the arena after death.");
    SendClientMessage(playerid, DM_COLOR_GRAY, "Commands: /dm - menu, /dmexit - leave, /dmstats - stats.");
    return 1;
}

stock DM_Exit(playerid)
{
    if(!gInDM[playerid])
    {
        SendClientMessage(playerid, DM_COLOR_GRAY, "BLESK DM: You are not in the DM zone.");
        return 1;
    }

    gInDM[playerid] = false;
    DM_DestroyMap(playerid);

    ResetPlayerWeapons(playerid);
    for(new slot = 0; slot < 13; slot++)
    {
        if(gSavedWeapon[playerid][slot] > 0 && gSavedAmmo[playerid][slot] > 0)
        {
            GivePlayerWeapon(playerid, gSavedWeapon[playerid][slot], gSavedAmmo[playerid][slot]);
        }
    }

    SetPlayerInterior(playerid, gReturnInterior[playerid]);
    SetPlayerVirtualWorld(playerid, gReturnWorld[playerid]);
    SetPlayerPos(playerid, gReturnX[playerid], gReturnY[playerid], gReturnZ[playerid]);
    SetPlayerFacingAngle(playerid, gReturnA[playerid]);
    SetPlayerHealth(playerid, gReturnHealth[playerid]);
    SetPlayerArmour(playerid, gReturnArmour[playerid]);
    SetCameraBehindPlayer(playerid);

    SendClientMessage(playerid, DM_COLOR_GREEN, "BLESK DM: You left the DM zone and returned to the main world.");
    return 1;
}

stock DM_ShowMenu(playerid)
{
    if(gInDM[playerid])
    {
        ShowPlayerDialog(playerid, DM_DIALOG_MAIN, DIALOG_STYLE_LIST,
            "BLESK RUSSIA | DM",
            "RETURN TO DM\nDM STATS\nEXIT DM ZONE",
            "SELECT", "CLOSE");
    }
    else
    {
        ShowPlayerDialog(playerid, DM_DIALOG_MAIN, DIALOG_STYLE_LIST,
            "BLESK RUSSIA | MENU",
            "DM ZONE",
            "SELECT", "CLOSE");
    }
    return 1;
}

public OnFilterScriptInit()
{
    print("[BLESK DM] loaded");
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
    if(!IsPlayerConnected(playerid) || !gInDM[playerid]) return 0;
    DM_TeleportToRandomSpawn(playerid);
    return 1;
}

public OnPlayerDeath(playerid, killerid, reason)
{
    #pragma unused reason
    if(gInDM[playerid])
    {
        gDMDeaths[playerid]++;
        if(killerid != INVALID_PLAYER_ID && killerid != playerid && gInDM[killerid])
        {
            gDMKills[killerid]++;
            new msg[96], victimName[MAX_PLAYER_NAME + 1];
            GetPlayerName(playerid, victimName, sizeof victimName);
            format(msg, sizeof msg, "BLESK DM: Kill +1 | %s | K:%d D:%d", victimName, gDMKills[killerid], gDMDeaths[killerid]);
            SendClientMessage(killerid, DM_COLOR_GREEN, msg);
        }
    }
    return 1;
}

public OnDialogResponse(playerid, dialogid, response, listitem, inputtext[])
{
    #pragma unused inputtext
    if(dialogid == DM_DIALOG_MAIN)
    {
        if(!response) return 1;

        if(gInDM[playerid])
        {
            switch(listitem)
            {
                case 0: DM_TeleportToRandomSpawn(playerid);
                case 1:
                {
                    new msg[96];
                    format(msg, sizeof msg, "BLESK DM | Kills: %d | Deaths: %d", gDMKills[playerid], gDMDeaths[playerid]);
                    SendClientMessage(playerid, DM_COLOR_WHITE, msg);
                }
                case 2: DM_Exit(playerid);
            }
        }
        else if(listitem == 0)
        {
            ShowPlayerDialog(playerid, DM_DIALOG_CONFIRM, DIALOG_STYLE_MSGBOX,
                "BLESK RUSSIA | DM ZONE",
                "Enter the DM arena?\n\nWeapons are provided automatically.\nYour position, health and weapons are restored when you leave.",
                "ENTER", "CANCEL");
        }
        return 1;
    }

    if(dialogid == DM_DIALOG_CONFIRM)
    {
        if(response) DM_Enter(playerid);
        return 1;
    }
    return 0;
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if(!strcmp(cmdtext, "/dm", true) || !strcmp(cmdtext, "/dmmenu", true) || !strcmp(cmdtext, "/menu", true))
    {
        DM_ShowMenu(playerid);
        return 1;
    }

    if(!strcmp(cmdtext, "/dmzone", true))
    {
        DM_Enter(playerid);
        return 1;
    }

    if(!strcmp(cmdtext, "/dmexit", true))
    {
        DM_Exit(playerid);
        return 1;
    }

    if(!strcmp(cmdtext, "/dmstats", true))
    {
        new msg[96];
        format(msg, sizeof msg, "BLESK DM | Kills: %d | Deaths: %d", gDMKills[playerid], gDMDeaths[playerid]);
        SendClientMessage(playerid, DM_COLOR_WHITE, msg);
        return 1;
    }
    return 0;
}
