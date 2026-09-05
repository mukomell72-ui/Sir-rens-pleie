#include <a_samp>

#define BLESK_DIALOG_MAIN 28110
#define BLESK_DIALOG_RULES 28111
#define BLESK_DIALOG_SUPPORT 28112

public OnFilterScriptInit()
{
    print("[BLESK CORE] Project commands loaded.");
    return 1;
}

public OnPlayerConnect(playerid)
{
    SendClientMessage(playerid, 0xFFD21FFF, "BLESK RUSSIA | Welcome! Use /blesk for project menu.");
    return 1;
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if (!strcmp(cmdtext, "/blesk", true) || !strcmp(cmdtext, "/bleskhelp", true))
    {
        ShowPlayerDialog(playerid, BLESK_DIALOG_MAIN, DIALOG_STYLE_LIST,
            "BLESK RUSSIA",
            "Project information\nRules\nSupport\nVersion",
            "Open", "Close");
        return 1;
    }

    if (!strcmp(cmdtext, "/bleskrules", true))
    {
        ShowPlayerDialog(playerid, BLESK_DIALOG_RULES, DIALOG_STYLE_MSGBOX,
            "BLESK RUSSIA | RULES",
            "1. Respect other players.\n2. Do not use cheats or exploits.\n3. Do not spam or advertise.\n4. Follow administrator instructions.\n5. Play fairly and keep roleplay atmosphere.",
            "OK", "");
        return 1;
    }

    if (!strcmp(cmdtext, "/blesksupport", true))
    {
        ShowPlayerDialog(playerid, BLESK_DIALOG_SUPPORT, DIALOG_STYLE_MSGBOX,
            "BLESK RUSSIA | SUPPORT",
            "Use the social buttons in the BLESK RUSSIA launcher to contact the project team.",
            "OK", "");
        return 1;
    }

    if (!strcmp(cmdtext, "/bleskver", true))
    {
        SendClientMessage(playerid, 0xFFD21FFF, "BLESK RUSSIA | Server Pack 1.0.0");
        return 1;
    }

    return 0;
}

public OnDialogResponse(playerid, dialogid, response, listitem, inputtext[])
{
    if (dialogid == BLESK_DIALOG_MAIN)
    {
        if (!response) return 1;

        switch (listitem)
        {
            case 0:
            {
                ShowPlayerDialog(playerid, BLESK_DIALOG_SUPPORT, DIALOG_STYLE_MSGBOX,
                    "BLESK RUSSIA",
                    "BLESK RUSSIA is your roleplay project.\nLauncher and server branding are synchronized.",
                    "OK", "");
            }
            case 1:
            {
                ShowPlayerDialog(playerid, BLESK_DIALOG_RULES, DIALOG_STYLE_MSGBOX,
                    "BLESK RUSSIA | RULES",
                    "1. Respect other players.\n2. Do not use cheats or exploits.\n3. Do not spam or advertise.\n4. Follow administrator instructions.\n5. Play fairly and keep roleplay atmosphere.",
                    "OK", "");
            }
            case 2:
            {
                ShowPlayerDialog(playerid, BLESK_DIALOG_SUPPORT, DIALOG_STYLE_MSGBOX,
                    "BLESK RUSSIA | SUPPORT",
                    "Use the social buttons in the launcher to contact the project team.",
                    "OK", "");
            }
            case 3:
            {
                SendClientMessage(playerid, 0xFFD21FFF, "BLESK RUSSIA | Server Pack 1.0.0");
            }
        }
        return 1;
    }
    return 0;
}
