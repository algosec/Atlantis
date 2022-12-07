import mysql.connector
import json


def format_rows_as_settings(rows):
    jsonFormat = "{\"entities_to_insert\":["
    for row in rows:
        key = json.dumps(row[0])
        tenantId = json.dumps(row[1])
        value = row[2]
        jsonFormat = jsonFormat + "{\"key\": " + key + ", \"tenantId\": " + tenantId + ", \"value\": " + value + "}, "
    replacementStr = "]}"
    return jsonFormat[:-2] + replacementStr

def save_to_file(filePath, strToWrite):
    try:
        file = open(filePath, 'w')
        file.write(strToWrite)
    except IOError as error:
        print("Failed to open to write to file {}".format(error))
    finally:
        file.close


def export_settings_db_table(filePath, databaseName = "ms-settings", tableName = "settings"):
    try:
        conn = mysql.connector.connect(host='localhost',
                                       user='root',
                                       password='dev',
                                       database=databaseName)

        query = """SELECT * FROM {}""".format(tableName)
        cursor = conn.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        if tableName == "settings":
            jsonFormat = format_rows_as_settings(rows)
        save_to_file(filePath, jsonFormat)

    except mysql.connector.Error as error:
        print("Failed to connect to MySQL table {}".format(error))


if __name__ == '__main__':
    print("--------------------- extracting db to json file ---------------------")
    fileName = input("enter full path to save the file including file name: ")
    export_settings_db_table(fileName)
    print("Done")

