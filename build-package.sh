NAME=`node -p "require('./package.json').name"`
VERSION=`node -p "require('./package.json').version"`
TEMP_FOLDER="./"
DIST_FOLDER="$TEMP_FOLDER/package"
FILE_PATH="$TEMP_FOLDER/revogrid-$VERSION.tgz"

echo "--- Building version $VERSION ---"

echo "> cleaning temp folder ..."
rm -rf $DIST_FOLDER

echo "> making temp folder ..."
mkdir -p $DIST_FOLDER

echo "> copying files ..."
cp ./package.json "$DIST_FOLDER/package.json"
cp -r ./custom-element "$DIST_FOLDER/"
cp -r ./dist "$DIST_FOLDER/"
cp -r ./loader "$DIST_FOLDER/"

echo "> packaging ..."
tar -C $TEMP_FOLDER -czvf $FILE_PATH package

echo "> cleaning temp folder ..."
rm -rf $DIST_FOLDER

echo "--- Building done ---"

FILE_PATH=`node -p "require('path').resolve('$FILE_PATH')"`

explorer "/select,$FILE_PATH"
