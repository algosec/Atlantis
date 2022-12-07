import mysql.connector
import json

def insert_variables_into_table(key, tenantId, value):
    try:
        connection = mysql.connector.connect(host='localhost',
                                             user='root',
                                             password='dev',
                                             database='ms-settings')
        cursor = connection.cursor()
        mySql_insert_query = """INSERT INTO `settings` (`key`, `tenantId`, `value`)  
                                VALUES (%s, %s, %s) """

        record = (key, tenantId, value)
        cursor.execute(mySql_insert_query, record)
        connection.commit()
        print("Entity " + key + " inserted successfully into settings table")

    except mysql.connector.Error as error:
        print("Failed to insert into MySQL table {}".format(error))

    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def insert_data_from_file(pathToOpenFile):
    try:
        f = open(pathToOpenFile)
        data = json.load(f)
        for i in data['entities_to_insert']:
            insert_variables_into_table(i['key'], i['tenantId'], json.dumps(i['value']))
    except IOError as error:
        print("Failed to open file {}".format(error))
    finally:
        f.close()
    return 0


def write_entities_to_file(entities, filePath):
    file = open(filePath, 'w')
    file.write("{\"entities_to_insert\":[")
    j = 0
    for i in entities:
        j = j + 1
        file.write(json.dumps(i.__dict__))
        if not j == len(entities):
            file.write(",")
    file.write("]}")
    file.close()


if __name__ == '__main__':
        readyFilePath = "initializaSettingsDBEnteties.json"
        insert_data_from_file(readyFilePath)
        print("Done")