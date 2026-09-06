#define FILTERSCRIPT
#include <a_samp>

#define DIALOG_PLAYER_MENU 8
#define DIALOG_MPREG 27

stock ShowBleskPlayerMenu(playerid)
{
    ShowPlayerDialog(
        playerid,
        DIALOG_PLAYER_MENU,
        DIALOG_STYLE_LIST,
        "{0099CC}BLESK RUSSIA | Меню игрока",
        "{FFFFFF}1. Статистика\n"
        "2. Список команд\n"
        "3. Личные настройки\n"
        "4. Настройки безопасности\n"
        "5. Связь с администрацией\n"
        "6. Улучшения\n"
        "7. Правила сервера\n"
        "8. Изменить имя\n"
        "9. Дополнительно\n"
        "{FFFFCC}10. Активация промокода\n"
        "{FFFFFF}11. Достижения\n"
        "12. Квесты\n"
        "{FF4444}13. DM зона",
        "Выбрать",
        "Закрыть"
    );
    return 1;
}

public OnFilterScriptInit()
{
    print("[BLESK DM] SAFE menu bridge loaded");
    return 1;
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if(!strcmp(cmdtext, "/mm", true) || !strcmp(cmdtext, "/mn", true) || !strcmp(cmdtext, "/menu", true))
    {
        ShowBleskPlayerMenu(playerid);
        return 1;
    }
    return 0;
}

public OnDialogResponse(playerid, dialogid, response, listitem, inputtext[])
{
    #pragma unused inputtext

    if(dialogid == DIALOG_PLAYER_MENU && response)
    {
        if(listitem == 12)
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

        // For items 1-12, let the active gamemode process its own existing menu logic.
        return 0;
    }

    // Let the active gamemode process DIALOG_MPREG and spawn its existing DM zone.
    return 0;
}
