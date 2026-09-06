#define FILTERSCRIPT
#include <a_samp>

#define DIALOG_PLAYER_MENU (8)
#define DIALOG_MPREG       (27)

public OnFilterScriptInit()
{
    print("[BLESK DM] Player menu bridge loaded");
    return 1;
}

public OnDialogResponse(playerid, dialogid, response, listitem, inputtext[])
{
    #pragma unused inputtext

    if(dialogid == DIALOG_PLAYER_MENU && response && listitem == 12)
    {
        ShowPlayerDialog(
            playerid,
            DIALOG_MPREG,
            DIALOG_STYLE_LIST,
            "BLESK RUSSIA | DM ZONE",
            "DeathMatch Zone",
            "SELECT",
            "BACK"
        );
        return 1;
    }

    return 0;
}
