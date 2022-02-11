# Algo

Le fichier nommé `algo.py` sert à, lorsqu'il est utilisé, transformer des images en sprite. \
Toutes les images sont d'abord modifiées afin de pouvoir être analysées, puis elles sont copiées dans un autre format pour être utilisées par texture Packer.

**IL EST NECESSAIRE D'AVOIR UNE LICENSE DE TEXTUREPACKER**

## Rangement
Les images doivent être rangées dans un ordre bien particulier afin que toutes les sprites soient correctement générés.

A la racine, se situe le dossier `sources` qui contient ensuite tous les personnages ou les fonds d'écran, comme ci-dessous:
```
algo.py
sources/
|- Personnage_1/
|- Personnage_2/
|- Fond_1/
```
Chaque personnage (ou fond) pouvant avoir différent humeur, chaque dossier doit ensuite être rangés de manière à ce que le json décrivant tout soit généré correctement.\
Pour cela les images principales servant de base aux humeurs doivent être placées directement dans le dossier, les images qui sont ensuite animées (ou non) doivent être placées dans des dossiers qui, en plus de porter leur nom, portent aussi le nom de l'humeur sur laquel l'animation doit être dépasé.\
Le rangement est alors comme ci-dessous :
```
algo.py
sources/
|- Personnage1/
|  |- humeur1.png
|  |- humeur2.png
|  |- sprite1_humeur1/
|  |  |- image00.png
|  |  |- image01.png
|  |  |- image02.png
|  |- sprite2_humeur1-humeur2/
|  |  |- image00.png
|- Personnage2/
...
```

## Génération des images

Les images passent par plusieurs phases de traitement :\
- La première, et qui peut être évité si les images sont \*propres, est celle où tous les pixels subissent une transformation, si nécessaire, pour la prochaine étape.
- La seconde consiste à identifier la boite dans laquelle l'image ou les images sont contenues afin de pouvoir les prédécoupés pour *TexturePacker*
- La troisième est l'export du travail dans le dossier `export`, la structure des dossiers est la même que celle du fichier `sources`.\
Un fichier `base.json` est généré et décrit comment les sprites doivent être assemblés et positionnés.
- La quatrième étape consiste à passer TexturePacker partout, afin de transformer toutes les images en sprites, des `.png` et des `.json` sont alors générer dans les dossiers personnages et fonds, ces fichiers sont ceux qu'il faut copier et mettre dans le jeu.

Le rangement est alors comme ci-dessous :
```
algo.py
export/
|- Personnage1/
|  |- base.json
|  |- humeur1.json
|  |- humeur1.png
|  |- humeur2.json
|  |- humeur2.png
|  |- sprite1Hu.json
|  |- sprite1Hu.png
|  |- sprite2HuHu.json
|  |- sprite2HuHu.png
|  |- sprite1Hu/
|  |  |- image00.png
|  |  |- image01.png
|  |  |- image02.png
|  |- sprite2HuHu/
|  |  |- image00.png
|- Personnage2/
...
```

\*Les pixels transparents de l'image doivent avoir la valeur RGBA (0,0,0,0). Sinon la détection de la boite contenant l'image est faussé 

## Le fichier base.json

Ce fichier décrit précisement comment les sprites doivent être arrangés les uns avec les autres. A la racine du json se trouve toutes les humeurs ainsi que la clé `default` qui sert à donner l'humeur par défaut.

La structure est la suivante :
```
default - str: nom de l'humeur par défaut
<humeur> - list<dict>: remplacer <hummeur> par le nom de l'humeur en question
|- model - str: nom du sprite qui doit être positionné
|- x - int: emplacement en abscisse de l'image
|- y - int: emplacement en ordonnée de l'image
```

## Axe d'amélioration du script python

- Se séparer de *TexturePacker*
- Donner des identifiants uniques à chaque image lors de l'étape 3