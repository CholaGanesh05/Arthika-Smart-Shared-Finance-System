import zipfile, xml.etree.ElementTree as ET
with zipfile.ZipFile(r'd:\arthika\imp_details\Arthika_SRS_v1.0.docx') as docx:
    tree = ET.XML(docx.read('word/document.xml'))
    texts = []
    for elem in tree.iter():
        if elem.tag.endswith('}t') and elem.text:
            texts.append(elem.text)
    with open("docx_output.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(texts))
