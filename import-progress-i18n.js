(()=>{"use strict";
const SEL="#tns-import-progress-overlay";
const E={
"Procesando":["Processing","Traitement"],"Importando PDF":["Importing PDF","Importation du PDF"],"Añadiendo imagen":["Adding image","Ajout d'une image"],"Importando imágenes":["Importing images","Importation des images"],
"Cada página se convierte en una imagen y se añade como una card del documento.":["Each page is converted into an image and added as a document card.","Chaque page est convertie en image et ajoutée comme carte au document."],
"Las imágenes se preparan y se añaden al documento una por una.":["Images are prepared and added to the document one by one.","Les images sont préparées et ajoutées au document une par une."],
"Preparar contenido":["Prepare content","Préparer le contenu"],"Pendiente":["Pending","En attente"],"Esperando los archivos seleccionados…":["Waiting for the selected files…","En attente des fichiers sélectionnés…"],
"Crear cards":["Create cards","Créer les cartes"],"Todavía no se ha creado contenido.":["No content has been created yet.","Aucun contenu n'a encore été créé."],"Actualizar documento":["Update document","Mettre à jour le document"],
"El inspector se actualizará al finalizar.":["The inspector will update when the process finishes.","L'inspecteur sera mis à jour à la fin du processus."],"Preparando la importación.":["Preparing import.","Préparation de l'importation."],
"Puedes seguir trabajando cuando termine este proceso.":["You can continue working when this process is finished.","Vous pourrez continuer à travailler lorsque ce processus sera terminé."],"Cerrar":["Close","Fermer"],
"Leyendo el archivo PDF…":["Reading the PDF file…","Lecture du fichier PDF…"],"Preparando archivos…":["Preparing files…","Préparation des fichiers…"],"Completado":["Completed","Terminé"],"En progreso":["In progress","En cours"],"Con error":["Error","Erreur"],
"Contenido preparado.":["Content prepared.","Contenu préparé."],"El documento se actualizará al terminar las cards.":["The document will update after the cards are created.","Le document sera mis à jour une fois les cartes créées."],
"Creando contenido.":["Creating content.","Création du contenu."],"Procesando elementos…":["Processing items…","Traitement des éléments…"],"Importación en curso.":["Import in progress.","Importation en cours."],
"Refrescando el documento y el inspector…":["Refreshing the document and inspector…","Actualisation du document et de l'inspecteur…"],"Cards listas.":["Cards ready.","Cartes prêtes."],
"Actualizando la estructura final del documento…":["Updating the document's final structure…","Mise à jour de la structure finale du document…"],"Documento e inspector actualizados.":["Document and inspector updated.","Document et inspecteur mis à jour."],
"Importación terminada con avisos.":["Import finished with warnings.","Importation terminée avec des avertissements."],"Importación completada.":["Import completed.","Importation terminée."],"Importación cancelada.":["Import cancelled.","Importation annulée."],
"Archivo leído.":["File read.","Fichier lu."],"No se realizaron cambios finales.":["No final changes were made.","Aucune modification finale n'a été effectuée."],"No se pudo completar la importación.":["The import could not be completed.","L'importation n'a pas pu être terminée."],
"La importación terminó con un error.":["The import ended with an error.","L'importation s'est terminée avec une erreur."],"Leyendo PDF…":["Reading PDF…","Lecture du PDF…"],"Leyendo PDF.":["Reading PDF.","Lecture du PDF."],
"Preparando el documento para convertir sus páginas.":["Preparing the document to convert its pages.","Préparation du document pour convertir ses pages."],"Documento actualizado después de la carga múltiple.":["Document updated after the batch import.","Document mis à jour après l'importation multiple."],
"PDF convertido y documento actualizado.":["PDF converted and document updated.","PDF converti et document mis à jour."],"Se canceló la importación de este PDF.":["This PDF import was cancelled.","L'importation de ce PDF a été annulée."],
"Imagen":["Image","Image"],"Imagen preparada.":["Image prepared.","Image préparée."],"Actualizando el documento…":["Updating the document…","Mise à jour du document…"],"Imagen añadida al documento.":["Image added to the document.","Image ajoutée au document."]};
function lang(){const a=document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang,h=String(document.documentElement.lang||"").slice(0,2).toLowerCase();return a||h||"es"}
function tr(s,l){if(l!=="en"&&l!=="fr")return s;const i=l==="en"?0:1;if(E[s])return E[s][i];let m;
if(m=s.match(/^(\d+) imagen(?:es)? seleccionada(?:s)?\.$/i)){let n=+m[1];return l==="en"?`${n} image${n===1?"":"s"} selected.`:`${n} image${n===1?"":"s"} sélectionnée${n===1?"":"s"}.`}
if(m=s.match(/^(\d+) página(?:s)?\.$/i)){let n=+m[1];return `${n} page${n===1?"":"s"}.`}
if(m=s.match(/^Página (\d+) de (\d+)$/i))return l==="en"?`Page ${m[1]} of ${m[2]}`:`Page ${m[1]} sur ${m[2]}`;
if(m=s.match(/^Archivo preparado · (.+)$/i))return l==="en"?`File prepared · ${m[1]}`:`Fichier préparé · ${m[1]}`;
if(m=s.match(/^Leyendo (.+)…$/i))return l==="en"?`Reading ${m[1]}…`:`Lecture de ${m[1]}…`;
if(m=s.match(/^(.+?) · (\d+) página(?:s)?\.$/i)){let n=+m[2];return `${m[1]} · ${n} page${n===1?"":"s"}.`}
if(m=s.match(/^(\d+)(?: de (\d+))? card(?:s)? creada(?:s)?(?: · (.*?))?(?: · (\d+) con error)?\.$/i)){let n=+m[1],t=m[2]?+m[2]:0,item=m[3]||"",f=m[4]?+m[4]:0;if(l==="en")return `${n}${t?` of ${t}`:""} card${n===1?"":"s"} created${item?` · ${item}`:""}${f?` · ${f} with errors`:""}.`;return `${n}${t?` sur ${t}`:""} carte${n===1?"":"s"} créée${n===1?"":"s"}${item?` · ${item}`:""}${f?` · ${f} avec erreur${f===1?"":"s"}`:""}.`}
if(m=s.match(/^(\d+) de (\d+) cards listas\.$/i))return l==="en"?`${m[1]} of ${m[2]} cards ready.`:`${m[1]} sur ${m[2]} cartes prêtes.`;
if(m=s.match(/^(\d+) cards? listas?\.$/i)){let n=+m[1];return l==="en"?`${n} card${n===1?"":"s"} ready.`:`${n} carte${n===1?"":"s"} prête${n===1?"":"s"}.`}
if(m=s.match(/^(\d+) de (\d+) completado\.$/i))return l==="en"?`${m[1]} of ${m[2]} completed.`:`${m[1]} sur ${m[2]} éléments terminés.`;
if(m=s.match(/^(\d+) elementos listos y (\d+) con error\.$/i))return l==="en"?`${m[1]} items ready and ${m[2]} with errors.`:`${m[1]} éléments prêts et ${m[2]} avec erreur${m[2]==="1"?"":"s"}.`;
if(m=s.match(/^(\d+) elemento(?:s)? listo(?:s)? para la vista calculadora\.$/i)){let n=+m[1];return l==="en"?`${n} item${n===1?"":"s"} ready for calculator view.`:`${n} élément${n===1?"":"s"} prêt${n===1?"":"s"} pour l'affichage calculatrice.`}return s}
function nodeText(v,l){v=String(v??"");let a=v.match(/^\s*/)?.[0]||"",b=v.match(/\s*$/)?.[0]||"",c=v.slice(a.length,b.length?v.length-b.length:undefined);if(!c)return v;let x=tr(c,l);return x===c?v:a+x+b}
function scan(){let o=document.querySelector(SEL),l=lang();if(!o||l==="es")return;let w=document.createTreeWalker(o,NodeFilter.SHOW_TEXT),n,A=[];while(n=w.nextNode())A.push(n);for(n of A){let x=nodeText(n.nodeValue,l);if(x!==n.nodeValue)n.nodeValue=x}let a=o.getAttribute("aria-label");if(a){let x=tr(a,l);if(x!==a)o.setAttribute("aria-label",x)}}
function install(){scan();new MutationObserver(ms=>{let ok=false;for(const m of ms){let t=m.target instanceof Element?m.target:m.target.parentElement;if(t?.closest?.(SEL)){ok=true;break}for(const n of m.addedNodes)if(n instanceof Element&&(n.matches?.(SEL)||n.querySelector?.(SEL))){ok=true;break}if(ok)break}if(ok)queueMicrotask(scan)}).observe(document.body,{childList:true,subtree:true,characterData:true})}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",install,{once:true}):install();})();
