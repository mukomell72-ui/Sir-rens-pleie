#pragma compat

#define BLESK_NAME "BLESK RUSSIA"
#define BLESK_VERSION "0.1.0"
#define PLAYER_MARKERS_MODE_GLOBAL 1

// SA-MP natives used by the clean BLESK RUSSIA base.
native SetGameModeText(const string[]);
native ShowNameTags(show);
native ShowPlayerMarkers(mode);
native EnableStuntBonusForAll(enable);
native UsePlayerPedAnims();
native AddPlayerClass(modelid, Float:spawn_x, Float:spawn_y, Float:spawn_z, Float:z_angle, weapon1, weapon1_ammo, weapon2, weapon2_ammo, weapon3, weapon3_ammo);
native SendClientMessage(playerid, color, const message[]);
native SetPlayerPos(playerid, Float:x, Float:y, Float:z);
native SetPlayerCameraPos(playerid, Float:x, Float:y, Float:z);
native SetPlayerCameraLookAt(playerid, Float:x, Float:y, Float:z);
native SetPlayerFacingAngle(playerid, Float:angle);
native SetCameraBehindPlayer(playerid);
native strcmp(const string1[], const string2[], bool:ignorecase = false, length = 0);
native format(output[], len, const format[], {Float,_}:...);
native print(const string[]);
native printf(const format[], {Float,_}:...);

// Our own BLESK CORE plugin API.
native BleskCore_IsLoaded();
native BleskCore_Version();
native BleskCore_Build();
native BleskCore_Features();

main()
{
    print("========================================");
    print(" BLESK RUSSIA Base v0.1");
    print(" Editable PWN gamemode started");
    print("========================================");
}

public OnGameModeInit()
{
    SetGameModeText("BLESK RUSSIA Base v0.1");
    ShowNameTags(1);
    ShowPlayerMarkers(PLAYER_MARKERS_MODE_GLOBAL);
    EnableStuntBonusForAll(0);
    UsePlayerPedAnims();

    // Temporary spawn point used only to verify our own gamemode.
    AddPlayerClass(0, 1958.3783, 1343.1572, 15.3746, 270.0, 0, 0, 0, 0, 0, 0);

    if (BleskCore_IsLoaded())
    {
        printf("[BLESK RUSSIA] BLESK CORE OK: version=%d build=%d features=%d",
            BleskCore_Version(), BleskCore_Build(), BleskCore_Features());
    }
    else
    {
        print("[BLESK RUSSIA] ERROR: BLESK CORE is not available.");
    }

    return 1;
}

public OnGameModeExit()
{
    print("[BLESK RUSSIA] Base v0.1 stopped.");
    return 1;
}

public OnPlayerConnect(playerid)
{
    SendClientMessage(playerid, 0xFFFFFFFF, "BLESK RUSSIA Base v0.1");
    SendClientMessage(playerid, 0xFFD200FF, "Our editable PWN gamemode is active.");
    return 1;
}

public OnPlayerRequestClass(playerid, classid)
{
    SetPlayerPos(playerid, 1958.3783, 1343.1572, 15.3746);
    SetPlayerCameraPos(playerid, 1968.3783, 1343.1572, 18.0);
    SetPlayerCameraLookAt(playerid, 1958.3783, 1343.1572, 15.3746);
    return 1;
}

public OnPlayerSpawn(playerid)
{
    SetPlayerPos(playerid, 1958.3783, 1343.1572, 15.3746);
    SetPlayerFacingAngle(playerid, 270.0);
    SetCameraBehindPlayer(playerid);
    return 1;
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if (!strcmp(cmdtext, "/blesk", true))
    {
        SendClientMessage(playerid, 0xFFD200FF, "BLESK RUSSIA: editable PWN base is active.");
        return 1;
    }

    if (!strcmp(cmdtext, "/bleskcore", true))
    {
        new message[128];
        format(message, sizeof message, "BLESK CORE: version=%d build=%d features=%d",
            BleskCore_Version(), BleskCore_Build(), BleskCore_Features());
        SendClientMessage(playerid, 0x33CC33FF, message);
        return 1;
    }

    return 0;
}
