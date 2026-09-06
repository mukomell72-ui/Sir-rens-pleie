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

    // The active gamemode owns dialog 8. We intercept only the new 13th item.
    if(dialogid == DIALOG_PLAYER_MENU && response && listitem == 12)
    {
        ShowPlayerDialog(
            playerid,
            DIALOG_MPREG,
            DIALOG_STYLE_LIST,
            "{FFCD00}Регистрация на мероприятия",
            "{FFCD00}[1] {FFFFFF}DeathMatch Zone",
            "Выбрать",
            "Отмена"
        );
        return 1;
    }

    // Everything else, including DIALOG_MPREG response, must continue to the gamemode.
    return 0;
}
