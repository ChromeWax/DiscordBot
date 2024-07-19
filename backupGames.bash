#!/bin/bash

rsync -a /home/chromewax/minecraft/ /home/chromewax/backup/Minecraft
rsync -a /home/chromewax/Steam/steamapps/common/PalServer/Pal/Saved/SaveGames/ /home/chromewax/backup/Palworld/SaveGames
rclone sync /home/chromewax/backup onedrive:Backups/ChromeBox