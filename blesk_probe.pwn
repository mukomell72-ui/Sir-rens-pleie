#define FILTERSCRIPT
#include <a_samp>

public OnFilterScriptInit()
{
    print("[BLESK PROBE] OK - filterscript loaded");
    return 1;
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if(!strcmp(cmdtext, "/bleskprobe", true))
    {
        SendClientMessage(playerid, 0x45D483FF, "BLESK PROBE: server-side filterscript is working.");
        return 1;
    }
    return 0;
}
